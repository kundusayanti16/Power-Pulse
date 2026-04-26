import Feedback from '../models/Feedback.js';

const submitFeedback = async (req, res) => {
  try {
    const { name, rating, comment } = req.body;

    if (!name || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars.' });
    }

    const feedback = await Feedback.create({
      name,
      rating,
      comment
    });

    res.status(201).json({ success: true, message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Feedback Error:', error.message);
    res.status(500).json({ success: false, message: 'Server error while submitting feedback.' });
  }
};

export { submitFeedback };
