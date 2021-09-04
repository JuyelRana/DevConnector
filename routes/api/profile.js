const express = require('express');
const request = require('request');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const { body, validationResult, check } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route      GET api/profile/me
// @des        Get current user profile
// @access     Private
router.get('/me', auth, async (req, res)=> {
    try {
        const profile = await Profile.findOne({user: req.user.id}).populate('user',['name','avatar']);

        if(!profile){
            return res.status(400).json({msg: 'There is no profile for this user.'});
        }

        res.json(profile);

    } catch (err) {
        console.log(err.message);
        res.status(500).send('Internal Server Error');
    }
});

// @route      POST api/profile
// @des        Create or update user profile
// @access     Private
router.post('/', [auth,[
    check('status', 'Status is required').not().isEmpty(),
    check('skills','Skills is required').not().isEmpty()
]], async (req, res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const {
        company,
        website,
        location,
        bio,
        status,
        githubusername,
        skills,
        youtube,
        facebook,
        twitter,
        instagram, 
        linkedin
    } = req.body;

    const profileFields = {};
    profileFields.user = req.user.id;

    if(company) profileFields.company = company;
    if(website) profileFields.website = website;
    if(location) profileFields.location = location;
    if(bio) profileFields.bio = bio;
    if(status) profileFields.status = status;
    if(githubusername) profileFields.githubusername = githubusername;
    if(skills){
        profileFields.skills = skills.split(',').map(skill=>skill.trim())
    }

    // Build Social object
    profileFields.social = {};
    if(youtube) profileFields.social.youtube = youtube;
    if(facebook) profileFields.social.facebook = facebook;
    if(twitter) profileFields.social.twitter = twitter;
    if(instagram) profileFields.social.instagram = instagram;
    if(linkedin) profileFields.social.linkedin = linkedin;

    try {
        
        let profile = await Profile.findOne({user: req.user.id});
        
        if(profile){
            // Update 
            profile = await Profile.findOneAndUpdate(
               {user: req.user.id},
               {$set: profileFields}, 
               {new: true}
            );

            return res.json(profile);
        }

        // Create 
        profile = new Profile(profileFields);
        await profile.save();

        return res.json(profile);
        
    } catch (err) {
        console.log('err.message');
        res.status(500).send('Internal Server Error');
    }

    res.send('Profile Created');

});


// @route      GET api/profile
// @des        Get all profiles
// @access     Public
router.get('/', async (req, res)=>{
    try {
        const profiles = await Profile.find().populate('user',['name','avatar']);
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
});


// @route      GET api/profile/user/:user_id
// @des        Get all profile by user_id
// @access     Public
router.get('/user/:user_id', async (req, res)=>{
    try {
        const profile = await Profile.findOne({user: req.params.user_id}).populate('user',['name','avatar']);
        if(!profile){
            return res.status(400).json({msg: 'Profile not found.'})
        }
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg: 'Profile not found.'})
        }
        res.status(500).send('Internal Server Error');
    }
});

// @route      DELETE api/profile
// @des        Delete profile, user & post
// @access     private
router.delete('/', auth,async (req, res)=>{

    try {

        // @rodo - remove user posts
        
        // Remove Profile
        await Profile.findOneAndRemove({user: req.user.id});

        // Remove user
        await User.findOneAndRemove({ _id: req.user.id});

        res.json({msg: 'User deleted'});
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg: 'Profile not found.'})
        }
        res.status(500).send('Internal Server Error');
    }
});


// @route      UPDATE api/profile/experience
// @des        Add Profile experience
// @access     private
router.put('/experience', [auth,[
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const newExp =  {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;

    try {
        const profile = await Profile.findOne({user: req.user.id});
        profile.experience.unshift(newExp);
        await profile.save();

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }


});


// @route      UPDATE api/profile/experience/exp_id
// @des        Update Profile experience
// @access     private
router.put('/experience/:exp_id', [auth,[
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const updatedExp =  {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;

    try {
        let profile = await Profile.findOne({user: req.user.id});
        profile.experience = profile.experience.map((item)=>{
            if(item?.id == req.params.exp_id){
                item.title = updatedExp.title;
                item.company = updatedExp.company;
                item.location = updatedExp.location;
                item.from = updatedExp.from;
                item.to = updatedExp.to;
                item.current = updatedExp.current;
                item.description = updatedExp.description;
            }

            if(!item){
                item = updatedExp;
            }

            return item;
        });

        await profile.save();

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

});


// @route      DELETE api/profile/experience/exp_id
// @des        Delete Profile experience
// @access     private
router.delete('/experience/:exp_id', auth, async (req, res)=>{
    try {
        let profile = await Profile.findOne({user: req.user.id});

        profile.experience = profile.experience.filter(item=>item.id != req.params.exp_id);

        await profile.save();

        res.json(profile);

    } catch (err) {
        console.log(err.message);
        res.status(500).send('Internal Server Error');
    }
});



// @route      UPDATE api/profile/education
// @des        Add Profile education
// @access     private
router.put('/education', [auth,[
    check('school', 'School is required').not().isEmpty(),
    check('degree', 'Degree is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const newEdu =  {
        school,
        degree,
        from,
        to,
        current,
        description
    } = req.body;

    try {
        const profile = await Profile.findOne({user: req.user.id});
        profile.education.unshift(newEdu);
        await profile.save();

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

});


// @route      UPDATE api/profile/education/edu_id
// @des        Update Profile education
// @access     private
router.put('/education/:edu_id', [auth,[
    check('school', 'School is required').not().isEmpty(),
    check('degree', 'Degree is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
]], async (req, res)=>{

    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const updatedEdu =  {
        school,
        degree,
        from,
        to,
        current,
        description
    } = req.body;

    try {
        let profile = await Profile.findOne({user: req.user.id});

        profile.education = profile.education.map((item)=>{
            if(item?.id == req.params.edu_id){
                item.school = updatedEdu.school;
                item.degree = updatedEdu.degree;
                item.from = updatedEdu.from;
                item.to = updatedEdu.to;
                item.current = updatedEdu.current;
                item.description = updatedEdu.description;
            }

            if(!item){
                item = updatedEdu;
            }

            return item;
        });

        await profile.save();

        res.json(profile);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }

});


// @route      DELETE api/profile/education/edu_id
// @des        Delete Profile education
// @access     private
router.delete('/education/:edu_id', auth, async (req, res)=>{
    try {
        let profile = await Profile.findOne({user: req.user.id});

        profile.education = profile.education.filter(item=>item.id != req.params.edu_id);

        await profile.save();

        res.json(profile);

    } catch (err) {
        console.log(err.message);
        res.status(500).send('Internal Server Error');
    }
});


// @route      GET api/profile/github/:username
// @des        Get user repos from Github
// @access     public
router.get('/github/:username', (req,res)=>{
    try {
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubClientSecret')}`,
            method: 'GET',
            headers: {'user-agent':'node.js'}
        }

        request(options, (error, response, body)=>{
            if(error) console.error(error);

            if(response.statusCode !== 200){
                return res.status(404).json({msg: 'No Github profile found'});
            }

            res.json(JSON.parse(body));
        })

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Internal Server Error');
    }
})


module.exports = router;