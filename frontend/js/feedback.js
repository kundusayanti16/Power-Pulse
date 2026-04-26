document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedback-form');
  const btn = document.getElementById('feedback-btn');
  
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    document.getElementById('name-err').textContent = '';
    document.getElementById('rating-err').textContent = '';
    document.getElementById('comment-err').textContent = '';

    // Get values
    const name = document.getElementById('f-name').value.trim();
    const comment = document.getElementById('f-comment').value.trim();
    
    // Get the selected radio button for rating
    const ratingElement = document.querySelector('input[name="rating"]:checked');
    const rating = ratingElement ? parseInt(ratingElement.value, 10) : null;

    let hasError = false;

    if (!name) {
      document.getElementById('name-err').textContent = 'Please enter your name.';
      hasError = true;
    }
    if (!rating) {
      document.getElementById('rating-err').textContent = 'Please select a star rating.';
      hasError = true;
    }
    if (!comment) {
      document.getElementById('comment-err').textContent = 'Please provide your feedback.';
      hasError = true;
    }

    if (hasError) return;

    // Send to backend
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, comment })
      });

      const data = await res.json();

      if (data.success) {
        triggerCircuitGlow();
        // Show success card
        document.getElementById('feedback-section').style.display = 'none';
        document.getElementById('success-card').style.display = 'block';
      } else {
        document.getElementById('comment-err').textContent = data.message || 'Error submitting feedback.';
        btn.disabled = false;
        btn.textContent = 'Submit Feedback';
      }
    } catch (err) {
      document.getElementById('comment-err').textContent = 'Network error. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Submit Feedback';
    }
  });
});
