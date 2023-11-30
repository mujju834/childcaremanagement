const bcrypt = require('bcryptjs');

async function testBcrypt() {
    const password = '11';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Original:', password);
    console.log('Hashed:', hashedPassword);

    const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);
    console.log('Is password correct:', isPasswordCorrect);
}

testBcrypt();
