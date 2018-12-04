import async from 'async';
import User from '../database/models/user';
import cryptoGen from '../authentication/cryptoGen';
import tokenValidityConfig from '../properties/tokenValidity';
import emailService from './emailService';

/**
 * This service performs security related tasks, like signup
 */
export default {
    signup(userObj) {
        let user = new User({
            email: userObj.email,
            password: cryptoGen.createPasswordHash(userObj.password),
            name: userObj.name
        });

        return  user.save()
                    .then(doc => {
                        console.log("[DB]: User inserted => ", doc)
                        emailService.emailEmailConfirmationInstructions(doc.email, doc.name, doc.emailConfirmationToken)
                        return {email: doc.email, name: doc.name};
                    })
                    .catch(err => {
                        console.log("[ERROR]: User insertion failed => ", err)
                        return err;
                    })
    },

    forgotPassword(email) {
        async.waterfall([
            cryptoGen.generateRandomTokenWithCallback,
            // The asynchronous function above generates the token and passes it to the next function below
            (token, callback) => {
                console.log(token);
                User.findOne({email: email}, (err, user) => {
                    // Return if any errors exist
                    if (err) {
                        return err;
                    }
                    // Return if user does not exist
                    if (!user) {
                        return {code: 404, errmsg: 'User does not exist'}
                    }
                    // If user exists, then generate token and save it
                    user.passwordResetToken = token;
                    user.passwordResetExpires = Date.now() + tokenValidityConfig.passwordResetTokenValidFor;

                    user.save((err) => {
                        if (err) {
                            return {code: 500, errmsg: 'Server could not generate token'}
                        }
                        callback(err, token, user);
                    })
                    
                })

            },
            // Send email in the function below
            (token, user) => {
                // Send password reset email here
                emailService.emailPasswordResetInstructions(user.email, user.name, token);
            }
        ])
    },

    isPasswordResetTokenValid(token) {
        User.findOne({ passwordResetToken: token, resetPasswordExpires: {$gt: Date.now()}}, (err, user) => {
            if (err) {return err; }
            // If no matching users were found, it should definitely be expired/invalid token, because this would get called only if user received a reset link
            if (!user) {
                return false;
            }
            return true;
        })
    },

    resetPassword(token, password) {
        async.waterfall([
            (callback) => {
                User.findOne({passwordResetToken: token, passwordResetExpires: { $gt: Date.now()}}, (err, user) => {
                    if (err) { return err; }
                    if (!user) {
                        return {code: 404, errmsg: 'The token is invalid or already expired.'}
                    }

                    // if user is found, then go ahead and update the password
                    user.password = cryptoGen.createPasswordHash(password);
                    user.passwordResetToken = undefined;
                    user.passwordResetExpires = undefined;

                    user.save((err) => {
                        if (err) {
                            return {code: 500, errmsg: 'Server could not reset password'}
                        }
                        callback(err, user);
                    })

                })
            },
            (user) => {
                // Send password reset confirmation to the user
                emailService.emailPasswordResetConfirmation(user.email, user.name);
            }            
        ])
    }


}