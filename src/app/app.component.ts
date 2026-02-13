import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import parsePhoneNumber, {
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';
import { QRCodeComponent } from 'angularx-qrcode';

interface CountryOption {
  code: CountryCode;
  label: string;
}

@Component({
    selector: 'app-root',
    imports: [QRCodeComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly countryStorageKey = 'wa-linker-country';
  private readonly fallbackCountry: CountryCode = 'AT';
  selectedCountry = signal<CountryCode>(this.fallbackCountry);
  countries: CountryOption[];

  numberValid = signal<boolean | undefined>(undefined);

  formattedNumber = signal<string | undefined>(undefined);

  whatsappLink = signal<string | undefined>(undefined);

  private readonly handlerRegisteredKey = 'wa-linker-tel-handler-registered';
  canRegisterProtocol = signal<boolean>(
    typeof navigator !== 'undefined' && 'registerProtocolHandler' in navigator
  );
  protocolHandlerRegistered = signal<boolean>(
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('wa-linker-tel-handler-registered') === 'true'
  );

  private readonly themeStorageKey = 'theme';
  private theme: 'light' | 'dark' | null = null;

  @ViewChild('number')
  numberInput?: ElementRef<HTMLInputElement>;

  constructor() {
    const displayNames = new Intl.DisplayNames([...navigator.languages, 'en'], { type: 'region' });
    this.countries = getCountries()
      .map((code) => ({
        code,
        label: `${displayNames.of(code) ?? code} (+${getCountryCallingCode(code)})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  ngAfterViewInit(): void {
    this.handleIncomingTelProtocol();
  }

  ngOnInit(): void {
    const theme = localStorage.getItem(this.themeStorageKey);
    if (theme === 'light' || theme === 'dark') {
      this.theme = theme;
      this.setDocumentTheme(theme);
    }

    // Detect country from browser locale as a best-effort default (e.g. "de-AT" → "AT")
    const country = localStorage.getItem(this.countryStorageKey)
      ?? new Intl.Locale(navigator.language).region;
    if (country && getCountries().includes(country as CountryCode)) {
      this.selectedCountry.set(country as CountryCode);
    }
  }

  numberChange() {
    const inputValue = this.numberInput?.nativeElement?.value;
    if (!inputValue) {
      this.numberValid.set(undefined);
      return;
    }

    const phoneNumber = parsePhoneNumber(inputValue, this.selectedCountry());

    console.log(phoneNumber);

    if (!phoneNumber || !phoneNumber.isValid()) {
      this.numberValid.set(false);
      return;
    }

    if (phoneNumber.country && phoneNumber.country !== this.selectedCountry()) {
      this.selectedCountry.set(phoneNumber.country);
      localStorage.setItem(this.countryStorageKey, phoneNumber.country);
    }

    let numberStr = phoneNumber.formatInternational();

    this.formattedNumber.set(numberStr);

    numberStr = numberStr.replaceAll(' ', '').replaceAll('+', '');

    this.whatsappLink.set(`https://wa.me/${numberStr}`);
    this.numberValid.set(true);
  }

  countryChange(event: Event) {
    const code = (event.target as HTMLSelectElement).value as CountryCode;
    this.selectedCountry.set(code);
    localStorage.setItem(this.countryStorageKey, code);
    this.numberChange();
  }

  toggleTheme() {
    if (this.theme === 'light') {
      this.theme = 'dark';
    } else if (this.theme === 'dark') {
      this.theme = 'light';
    } else {
      if (window.matchMedia) {
        // Check if the dark-mode Media-Query matches
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          this.theme = 'light'; // browser default is dark => switch to light
        } else {
          this.theme = 'dark'; // browser default is light => switch to dark
        }
      } else {
        this.theme = 'dark'; // cannot find browser default (assuming light) => switch to dark
      }
    }
    this.setDocumentTheme(this.theme);
    localStorage.setItem(this.themeStorageKey, this.theme);
  }

  registerAsHandler(): void {
    try {
      navigator.registerProtocolHandler(
        'tel',
        `${window.location.origin}/?tel=%s`
      );
      this.protocolHandlerRegistered.set(true);
      localStorage.setItem(this.handlerRegisteredKey, 'true');
    } catch (e) {
      console.error('Failed to register protocol handler:', e);
    }
  }

  private handleIncomingTelProtocol(): void {
    const params = new URLSearchParams(window.location.search);
    const telParam = params.get('tel');
    if (!telParam) return;

    // Strip "tel:" scheme prefix if present (browser passes full URI)
    let phoneNumber = telParam;
    if (phoneNumber.toLowerCase().startsWith('tel:')) {
      phoneNumber = phoneNumber.substring(4);
    }

    // Decode any remaining URL encoding (e.g. %2B → +)
    phoneNumber = decodeURIComponent(phoneNumber);

    // Validate the phone number before accepting it
    const parsed = parsePhoneNumber(phoneNumber, this.selectedCountry());
    if (parsed?.isValid() && phoneNumber && this.numberInput?.nativeElement) {
      this.numberInput.nativeElement.value = phoneNumber;
      this.numberChange();
    }

    // Clean up the URL bar
    history.replaceState({}, '', window.location.pathname);
  }

  private setDocumentTheme(theme: 'light' | 'dark' | null) {
    const themeAttr = 'data-theme';
    // set theme attribute if applicable or remove if the attribute exits
    if (theme) {
      document?.documentElement?.setAttribute(themeAttr, theme);
    } else if (document?.documentElement?.hasAttribute(themeAttr)) {
      document?.documentElement?.removeAttribute(themeAttr);
    }
  }
}
