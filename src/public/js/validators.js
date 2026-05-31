

function showError(input, message) {
  let error = input.parentElement.querySelector(".error-msg");

  if (!error) {
    error = document.createElement("p");
    error.className = "text-red-500 text-xs mt-1 error-msg";
    input.parentElement.appendChild(error);
  }

  error.textContent = message;
  input.classList.add("border-red-500");
}

function clearError(input) {
  const error = input.parentElement.querySelector(".error-msg");
  if (error) error.remove();
  input.classList.remove("border-red-500");
}

function validateEmail(value) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(value);
}

function validateName(value) {
  const regex = /^[A-Za-z ]{3,50}$/;
  return regex.test(value);
}

function validatePhone(value) {
  const regex = /^[6-9]\d{9}$/;
  return regex.test(value);
}

function validatePassword(value) {
  return value.length >= 8;
}