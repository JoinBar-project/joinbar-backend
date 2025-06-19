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
  const adminEmail = 'admin@test.com';
  const adminPassword = 'Aa201201';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const [adminUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, adminEmail))
    .limit(1);

  if (!adminUser) {
    await db.insert(usersTable).values({
      username: '管理員',
      nickname: 'admin',
      email: adminEmail,
      password: hashedPassword,
      birthday: new Date('2025-01-01'),
      role: 'admin',
      isVerifiedEmail: true,
      providerType: 'email',
      status: 1,
    });
    console.log('✅ 管理員帳號建立成功');
  } else {
    console.log('ℹ️ 管理員已存在，不重複建立');
  }
}

async function generateUsers(count = 10) {
  try {
    for (let i = 0; i < count; i++) {
      const username = faker.person.fullName();
      const nickname = faker.internet.userName();
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
        role: 'user',
        isVerifiedEmail: false,
        providerType: 'email',
        status: 1,
      });
    }

    console.log('✅ 一般會員資料已寫入');
  } catch (err) {
    console.error('❌ 一般會員建立失敗', err);
  }
}


(async () => {
  await generateAdmin();
  await generateUsers(10);
})();