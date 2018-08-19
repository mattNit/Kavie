![capture](https://cloud.githubusercontent.com/assets/6363089/22178397/32213fe4-dff2-11e6-86e5-f60431852bd7.PNG)

[![Build Status](https://travis-ci.org/Knockout-Contrib/Knockout-Validation.svg)](https://travis-ci.org/matthewnitschke/Kavie)
[![npm version](https://badge.fury.io/js/kavie.svg)](https://badge.fury.io/js/kavie)
# Kavie
Kavie is a small and easy to use knockout js validation library.

## Installation
You can download kavie from npm
```
npm install kavie
```

Then include it in your project after knockout js
```html
<script src="/path/to/knockout.js"></script>
<script src="/node_modules/kavie/dist/kavie.js"></script>

<!-- Promise Polyfill for IE11 and Android support (only used with async validation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/2.4.1/core.js"></script>
```
it can also be included via node modules
```js
var ko = require('ko');
var Kavie = require('kavie');
```

# Usage

```javascript
function ViewModel(){
  var self = this;
  
  self.value = ko.observable().extend({
    kavie: {
      required: true
    }
  });
  
  self.submit = function(){
    if (Kavie.isValid(self)){
      console.log("All Good!");
    }
  }
}
```
## Html Side
Kavie works by adding a hasError variable to the observable. This gives the flexibility to add color changing to any element you want

```html
<input type="text" data-bind="textInput: value, css:{'error': value.hasError}"/>
<span data-bind="visible: value.hasError">Uh Oh! There was an error!</span>
```

# Validation Messages
You can use a validation message to display to the user if the validation failed

```html
<input data-bind="textInput: value">
<div data-bind="text: value.errorMessage"></div>
```
These validation messages are stored on the validators see [custom rules](https://github.com/matthewnitschke/Kavie/wiki/Custom-Rules) for more information

# Validation rules
There are a few validation rules build in

```javascript
self.value = ko.observable().extend({
    kavie: {
      required: true, // [boolean] this one is obvious
      maxLength: 3, // [int] max amount of characters: 3
      minLength: 2, // [int] min amount of characters: 2
      date: true, // [boolean] validates dates based on js dates
      birthdate: true, // [boolean] uses date, and must be in past with persons age less than 120
      phone: true, // [boolean] uses regex to validate a valid 10 digit phone number
      email: true, // [boolean] uses regex to validate a valid email
      numeric: true, // [boolean] must be an integer
      regexPattern: /([A-Z])\w+/ // [regex] matches a pattern
    }
});
```
It is important to note that on the date, birthdate, phone, email, and numeric validators, if the users input is null, undefined, or empty they will return true. This is so you can still have optional values and use these validators. If you want them required, add the required validator.

# More Features
There is much more to kavie, but in order to keep the readme simple the advanced features have been moved to the [wiki](https://github.com/matthewnitschke/Kavie/wiki)

## Problems?
Thanks of taking a look at kavie. If you have any problems let me know and I would love to help you out
