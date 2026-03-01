import bcrypt from 'bcryptjs';

const password = 'password123';
const hash = '$2a$10$Ht9N75ls.WxQgMkcwpiXGe6hXbAPmQWzUNJkMojGk3gNurTrBz.ta';

bcrypt.compare(password, hash).then(result => {
    console.log('Password matches:', result);
});
