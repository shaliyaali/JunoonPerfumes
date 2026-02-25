document.addEventListener("DOMContentLoaded", function () {

  const profileForm = document.querySelector('form[action="/updateprofile"]');
  if (!profileForm) return;

  const nameInput = document.getElementById("nameInput");
  const phoneInput = document.getElementById("phoneInput");

  profileForm.addEventListener("submit", function (e) {
    let valid = true;

    if (!validateName(nameInput.value.trim())) {
      showError(nameInput, "Name must be 3–50 letters");
      valid = false;
    } else {
      clearError(nameInput);
    }

    if (phoneInput.value && !validatePhone(phoneInput.value.trim())) {
      showError(phoneInput, "Enter valid 10-digit phone");
      valid = false;
    } else {
      clearError(phoneInput);
    }

    if (!valid) e.preventDefault();
  });

});