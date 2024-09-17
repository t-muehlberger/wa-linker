import { Component, ElementRef, input, signal, ViewChild } from '@angular/core';
import parsePhoneNumber, { isValidNumber, isValidPhoneNumber, parseNumber } from 'libphonenumber-js'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly defaultCountry = "AT"

  numberValid = signal<boolean|undefined>(undefined)

  formattedNumber = signal<string|undefined>(undefined)

  whatsappLink = signal<string|undefined>(undefined)

  @ViewChild("number")
  numberInput?: ElementRef<HTMLInputElement>

  numberChange() {
    const inputValue = this.numberInput?.nativeElement?.value
    if (!inputValue) {
      this.numberValid.set(undefined)
      return
    }

    const phoneNumber = parsePhoneNumber(inputValue, this.defaultCountry)

    console.log(phoneNumber)

    if (!phoneNumber || !phoneNumber.isValid()) {
      this.numberValid.set(false)
      return
    }

    let numberStr = phoneNumber.formatInternational()

    this.formattedNumber.set(numberStr)

    numberStr = numberStr
      .replaceAll(' ', '')
      .replaceAll('+', '')

    this.whatsappLink.set(`https://wa.me/${numberStr}`)
    this.numberValid.set(true)
  }
}
