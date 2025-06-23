const Section = require('../Model/Section')
const catchAsyncError = require("../../middleware/catchAsyncError");
const ErrorHandling = require("../../utils/ErrorHandling");

const addSection = catchAsyncError(async (req, res, next) => {
    const {title, description} = req.body;
    if (!title) return next(new ErrorHandling (400, "Title is required"))
    
    const section = new Section({
        userId: req.user._id,
        title, 
        description
    })
    await section.save();

    res.status(201).json({
        success: true,
        message: "Section created successfully",
        section
    })
})

const getSections = catchAsyncError(async (req, res, next) => {
    const sections = await Section.find({userId: req.user._id});
    console.log(sections);
    if (!sections) return next(new ErrorHandling(400, "No sections has been created"));

    res.status(200).json({
        sections
    })

})

const deleteSection = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;
    const section = await Section.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!section) {
        return next(new ErrorHandling(404, "Section not found or not authorized"));
    }
    res.status(200).json({
        success: true,
        message: "Section deleted successfully"
    });
})

module.exports = {addSection, getSections, deleteSection}