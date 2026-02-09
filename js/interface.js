document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    const xrButton = document.getElementById('xr-button');
    const overlay = document.getElementById('overlay');

    // Vérification de la compatibilité XR
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                xrButton.style.display = 'inline-block';
                xrButton.textContent = "PREPARING SPELLS...";

                xrButton.addEventListener('click', () => {
                    scene.enterAR();
                    hideOverlay();
                });
            } else {
                xrButton.style.display = 'inline-block';
                xrButton.textContent = "ENTER VR REALM";

                xrButton.addEventListener('click', () => {
                    scene.enterVR();
                    hideOverlay();
                });
            }
        });
    } else {
        xrButton.style.display = 'inline-block';
        xrButton.textContent = "NO MAGIC DETECTED (DEBUG)";
        xrButton.style.background = "#333";
        xrButton.style.borderColor = "#555";

        xrButton.addEventListener('click', () => {
            hideOverlay();
        });
    }

    function hideOverlay() {
        overlay.style.transition = "opacity 1.5s ease-in-out";
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
        }, 1500);
    }
});