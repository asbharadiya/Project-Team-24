var mongoose = require("mongoose");

var farmSchema = new mongoose.Schema({
    isDeleted : Boolean,
    owner : {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    streetAddress : String,
    city : String,
    state : String,
    zipCode : String,
    location: {
        type: [Number],// [<longitude>, <latitude>]
        index: '2d'// create the geospatial index
    },
    size : Number,
    waterConn : String,
    waterAlternative : String,
    appliedWaterConn : String,
    existingStructures : String
});

module.exports = mongoose.model('farms', farmSchema);