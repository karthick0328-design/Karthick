const Vacancy = require('../models/Vacancy');

const getAllVacancies = async (req, res) => {
  try {
    const vacancies = await Vacancy.find()
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: vacancies.length, data: vacancies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOpenVacancies = async (req, res) => {
  try {
    const vacancies = await Vacancy.find({ status: 'open' })
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: vacancies.length, data: vacancies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createVacancy = async (req, res) => {
  try {
    const vacancy = new Vacancy({
      ...req.body,
      postedBy: req.user.id,
    });
    await vacancy.save();
    res.status(201).json({ success: true, data: vacancy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateVacancy = async (req, res) => {
  try {
    const vacancy = await Vacancy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    res.json({ success: true, data: vacancy });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteVacancy = async (req, res) => {
  try {
    const vacancy = await Vacancy.findByIdAndDelete(req.params.id);
    if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    res.json({ success: true, message: 'Vacancy deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getVacancy = async (req, res) => {
  try {
    const vacancy = await Vacancy.findById(req.params.id).populate('postedBy', 'name email');
    if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    res.json({ success: true, data: vacancy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllVacancies,
  getOpenVacancies,
  createVacancy,
  updateVacancy,
  deleteVacancy,
  getVacancy
};