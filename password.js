document.body.classList.add("locked");

// SET YOUR PASSWORD HERE:
const PASSWORD = "STATS"; // ← change this word to your chosen password

document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.getElementById("pw-overlay");
    const input = document.getElementById("pw-input");
    const button = document.getElementById("pw-submit");
    const msg = document.getElementById("pw-msg");

    button.addEventListener("click", () => {
        if (input.value === PASSWORD) {
            overlay.style.display = "none";
            document.body.classList.remove("locked"); // ← THIS UNLOCKS THE PAGE
        } else {
            msg.textContent = "Incorrect password. Try again.";
            msg.style.display = "block"; // ensure it shows in case CSS had hidden it
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") button.click();
    });
});