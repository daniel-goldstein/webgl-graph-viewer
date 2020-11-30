const keys = { T: 84 };
var modalToggled = false;

export default function addKeyHandlers(document) {
  document.addEventListener("keydown", onKeyDown);
}

function onKeyDown(event) {
  switch (event.keyCode) {
    case keys.T:
      toggleModal(document);
      break;
  }
}

function toggleModal(document) {
  console.log("togglin' the modal");
  // Get the modal
  var modal = document.getElementById("myModal");
  if (modalToggled) {
    modal.style.display = "none";
  } else {
    modal.style.display = "block";
  }
  modalToggled = !modalToggled;
}
