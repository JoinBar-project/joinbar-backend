const { Faker, zh_TW, en } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { usersTable } = require('../models/schema');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');
dotenv.config();

const faker = new Faker({ locale: [zh_TW, en] });

function generatePassword() {
  const upperLetter = faker.string.alpha({ casing: 'upper', length: 1 });
  const lowerLetter = faker.string.alpha({ casing: 'lower', length: 1 });
  const number = faker.string.numeric(1);
  const rest = faker.internet.password(5);
  return `${upperLetter}${lowerLetter}${number}${rest}`;
}

async function generateAdmin() {
  try {
    const email = 'admin@test.com';
    const password = 'Aa201201';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [findAdmin] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

    if (!findAdmin) {
      await db.insert(usersTable).values({
        username: '管理員',
        nickname: 'admin',
        email: email,
        password: hashedPassword,
        birthday: new Date('2025-01-01'),
        role: 'admin',
        isVerifiedEmail: true,
        providerType: 'email',
        status: 1,
      });
      console.log('管理員帳號建立成功');
    } else {
      console.log('管理員已存在');
    }
  } catch (err) {
    console.error('管理員帳號建立失敗', err);
  }
}

async function generateUsers() {
  try {
    for (let i = 0; i < 10; i++) {
      const username = faker.person.fullName();
      const nickname = faker.internet.username();
      const email = faker.internet.email();
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      const birthday = faker.date.birthdate();

      await db.insert(usersTable).values({
        username,
        nickname,
        email,
        password: hashedPassword,
        birthday: new Date(birthday),
        isVerifiedEmail: false,
        providerType: 'email',
        status: 1,
      });
    }

    console.log('假資料已寫入資料庫');
  } catch (err) {
    console.error('假資料寫入失敗',err);
  }
}

generateAdmin();
generateUsers();
