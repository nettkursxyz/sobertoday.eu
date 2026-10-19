// Tidspunkt for når skjemaet ble vist
document.getElementById('ts').value =
    Math.floor(Date.now() / 1000);

document.getElementById('contact-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = this;
    const submitBtn = document.getElementById('submit-btn');
    const statusDiv = document.getElementById('form-status');

    submitBtn.disabled = true;
    submitBtn.innerText = 'Sending...';
    statusDiv.style.display = 'none';

    const formData = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });

        let data = {};

        try {
            data = await response.json();
        } catch (jsonError) {
            data = {};
        }

        statusDiv.style.display = 'block';

        if (response.ok) {
            statusDiv.className = 'status-success';
            statusDiv.innerText =
                data.success ||
                'Thank you! Your message has been sent.';

            form.reset();

            document.getElementById('ts').value =
                Math.floor(Date.now() / 1000);

        } else {
            statusDiv.className = 'status-error';
            statusDiv.innerText =
                data.error ||
                'Sorry, something went wrong. Please try again later.';
        }

    } catch (error) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-error';
        statusDiv.innerText =
            'Could not connect to the server. Check your internet connection.';
    }

    submitBtn.disabled = false;
    submitBtn.innerText = 'Send message';
});
