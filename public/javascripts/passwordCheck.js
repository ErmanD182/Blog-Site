function check_password() {

  if (document.getElementById("password").value ==
          document.getElementById("confirm_password").value) {
      document.getElementById("submit").disabled = false;
      document.getElementById('password-check').style.display = "none";
  } else {
      document.getElementById("submit").disabled = true;
      document.getElementById("password-check").style.display = "block";
  }
}
