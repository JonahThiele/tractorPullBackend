const crypto = require('crypto');

function generateHashedPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex'); 
    const iterations = 310000;
    const algorithm = 'sha256';
    crypto.pbkdf2(password, salt, iterations, 32, algorithm, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            return;
        }
        const hashedPasswordHex = hashedPassword.toString('hex');
        console.log('Salt:', salt);
        console.log('Hashed Password:', hashedPasswordHex);
    });
}
const password = 'saltOfTheEarth'; // Replace with the password you want to hash
generateHashedPassword(password);
