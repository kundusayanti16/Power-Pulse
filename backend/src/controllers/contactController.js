import ContactMessage from '../models/ContactMessage.js';

export const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const newMessage = await ContactMessage.create({ name, email, subject, message });
    
    res.status(201).json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you soon!',
      data: newMessage 
    });
  } catch (err) {
    console.error('Contact submission error:', err);
    res.status(500).json({ success: false, message: 'Error sending message.' });
  }
};
