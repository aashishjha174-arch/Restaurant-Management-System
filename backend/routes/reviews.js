const router = require('express').Router();
const Review = require('../models/Review');
const authMiddleware = require('../middleware/auth');

// 1. PUBLIC: Fetch approved reviews and aggregated score summaries
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 });
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) 
      : 0;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (ratingBreakdown[r.rating] !== undefined) {
        ratingBreakdown[r.rating]++;
      }
    });

    res.json({
      reviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews,
      ratingBreakdown
    });
  } catch (error) {
    console.error('Fetch Reviews Error:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// 2. PUBLIC: Submit review (pending approval)
router.post('/', async (req, res) => {
  try {
    const { name, rating, text } = req.body;

    if (!name || !rating || !text) {
      return res.status(400).json({ message: 'Name, rating, and review text are required' });
    }

    const starRating = parseInt(rating);
    if (isNaN(starRating) || starRating < 1 || starRating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
    }

    const newReview = new Review({
      name,
      rating: starRating,
      text,
      approved: false // requires admin moderation
    });

    await newReview.save();
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully! It will be visible once approved by admin.'
    });
  } catch (error) {
    console.error('Submit Review Error:', error);
    res.status(500).json({ message: 'Error submitting review' });
  }
});

// 3. ADMIN: Get all reviews (approved & pending)
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    const reviews = await Review.find({}).sort({ createdAt: -1 });
    
    // Aggregate overall metrics for the dashboard review tab
    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter(r => r.approved).length;
    const averageRating = approvedReviews > 0 
      ? (reviews.filter(r => r.approved).reduce((sum, r) => sum + r.rating, 0) / approvedReviews)
      : 0;

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      if (ratingBreakdown[r.rating] !== undefined) {
        ratingBreakdown[r.rating]++;
      }
    });

    res.json({
      reviews,
      metrics: {
        totalReviews,
        approvedReviews,
        pendingReviews: totalReviews - approvedReviews,
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingBreakdown
      }
    });
  } catch (error) {
    console.error('Admin Fetch Reviews Error:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// 4. ADMIN: Approve/moderation toggle
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { approved } = req.body;
    if (approved === undefined) {
      return res.status(400).json({ message: 'Approved field is required' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: approved === true || approved === 'true' },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({ success: true, review });
  } catch (error) {
    console.error('Approve Review Error:', error);
    res.status(500).json({ message: 'Error moderating review' });
  }
});

// 5. ADMIN: Delete review (Reject)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete Review Error:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

module.exports = router;
