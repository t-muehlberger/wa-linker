import {
  Component,
  ElementRef,
  HostBinding,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import parsePhoneNumber from 'libphonenumber-js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly defaultCountry = 'AT';

  numberValid = signal<boolean | undefined>(undefined);

  formattedNumber = signal<string | undefined>(undefined);

  whatsappLink = signal<string | undefined>(undefined);

  private readonly themeStorageKey = 'theme';
  private theme: 'light' | 'dark' | null = null;

  @ViewChild('number')
  numberInput?: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    const theme = localStorage.getItem(this.themeStorageKey);
    if (theme === 'light' || theme === 'dark') {
      this.theme = theme;
      this.setDocumentTheme(theme);
    }
  }

  numberChange() {
    const inputValue = this.numberInput?.nativeElement?.value;
    if (!inputValue) {
      this.numberValid.set(undefined);
      return;
    }

    const phoneNumber = parsePhoneNumber(inputValue, this.defaultCountry);

    console.log(phoneNumber);

    if (!phoneNumber || !phoneNumber.isValid()) {
      this.numberValid.set(false);
      return;
    }

    let numberStr = phoneNumber.formatInternational();

    this.formattedNumber.set(numberStr);

    numberStr = numberStr.replaceAll(' ', '').replaceAll('+', '');

    this.whatsappLink.set(`https://wa.me/${numberStr}`);
    this.numberValid.set(true);
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
