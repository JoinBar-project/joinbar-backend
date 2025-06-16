const { pgTable, varchar, bigint, timestamp, integer, index, smallint, serial, primaryKey, date, boolean, text, numeric, unique } = require('drizzle-orm/pg-core');

const usersTable = pgTable("users", {
  id: serial().primaryKey(),
  username: varchar({ length: 100 }).notNull(),
  nickname: varchar({ length: 100 }),
  email: varchar({ length: 100 }).unique(),
  password: varchar({ length: 100 }),
  role: varchar({ length: 20 }).default("user"), // 身分類型: 一般使用者 / 管理員
  birthday: date(),

  // LINE 登入相關欄位
  lineUserId: varchar('line_user_id', { length: 255 }).unique(),
  lineDisplayName: varchar('line_display_name', { length: 255 }),
  linePictureUrl: text('line_picture_url'),
  lineStatusMessage: text('line_status_message'),
  isLineUser: boolean('is_line_user').default(false),

  isVerifiedEmail: boolean("is_verified_email").default(false),
  providerType: varchar("provider_type", { length: 20 }), // 註冊方式: Email / Line / Google
  providerId: varchar("provider_id", { length: 100 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  avatarKey: varchar("avatar_key", { length: 255 }),
  avatarLastUpdated: timestamp("avatar_last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: smallint("status").default(1).notNull(), // 1: 正常 2: 刪除帳號
});

const userNotificationTable = pgTable("user_notification", {
  id: serial().primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  notificationType: varchar("notification_type", { length: 20 }).notNull(), // 通知類型: 新的活動參加者 / 新的留言
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const barsTable = pgTable("bars", {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  address: varchar({ length: 255 }),
  phone: varchar({ length: 20 }),
  description: text(),
  tags: varchar({ length: 20 }),
  rating: numeric("rating", { precision: 2, scale: 1 }), // 計算至小數點後一位
  openHours: varchar("open_hours", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

const userBarFoldersTable = pgTable("user_bar_folders", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  folderName: varchar("folder_name", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userBarFolderUnique: unique().on(table.userId, table.folderName)
})
);

const userBarCollectionTable = pgTable("user_bar_collection", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade", }),
  barId: integer("bar_id").references(() => barsTable.id, { onDelete: "cascade", }),
  folderId: integer("folder_id").references(() => userBarFoldersTable.id, { onDelete: "cascade", }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userBarUnique: unique().on(table.userId, table.barId),
})
);

const userEventCollectionTable = pgTable("user_event_collection", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade", }),
  eventId: bigint("event_id", { mode: "string" }).references(() => events.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").references(() => userEventFoldersTable.id, { onDelete: "cascade", }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userEventUnique: unique().on(table.userId, table.eventId),
})
);

const userEventParticipationTable = pgTable("user_event_participation", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade", }),
  eventId: bigint("event_id", { mode: "string" }).references(() => events.id, { onDelete: "cascade", }),
  joinedAt: timestamp("joined_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userEventParticipationUnique: unique().on(table.userId, table.eventId)
})
);

const userEventFoldersTable = pgTable("user_event_folders", {
  id: serial().primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  folderName: varchar("folder_name", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userEventFolderUnique: unique().on(table.userId, table.folderName)
})
);

const events = pgTable('events', {
  id: bigint('id', { mode: 'string' }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  barName: varchar('bar_name', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  maxPeople: integer('max_people'),
  imageUrl: varchar('image_url', { length: 255 }),
  price: integer('price'),
  hostUser: integer('host_user').notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  modifyAt: timestamp('modify_at', { withTimezone: true }).notNull(),
  status: smallint('status').default(1).notNull(), //1: 正常，2: 刪除， 3: 活動結束(程式判斷沒存DB)
}, (table) => ({
  hostUserIdx: index('idx_host_user').on(table.hostUser),
}));

const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }),
});

const eventTags = pgTable('event_tags', {
  eventId: bigint('event_id', { mode: 'string' }).notNull().references(() => events.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.tagId] })
}));

const barTags = pgTable('bar_tags', {
  bar_id: integer('bar_id').notNull().primaryKey().references(() => barsTable.id, { onDelete: 'cascade' }),
  sport: boolean('sport').notNull(),
  music: boolean('music').notNull(),
  student: boolean('student').notNull(),
  bistro: boolean('bistro').notNull(),
  drink: boolean('drink').notNull(),
  joy: boolean('joy').notNull(),
  romantic: boolean('romantic').notNull(),
  oldschool: boolean('oldschool').notNull(),
  highlevel: boolean('highlevel').notNull(),
  easy: boolean('easy').notNull(),
},);

const userTags = pgTable('user_tags', {
  user_id: integer('user_id').notNull().primaryKey().references(() => usersTable.id, { onDelete: 'cascade' }),
  sport: boolean('sport').notNull(),
  music: boolean('music').notNull(),
  student: boolean('student').notNull(),
  bistro: boolean('bistro').notNull(),
  drink: boolean('drink').notNull(),
  joy: boolean('joy').notNull(),
  romantic: boolean('romantic').notNull(),
  oldschool: boolean('oldschool').notNull(),
  highlevel: boolean('highlevel').notNull(),
  easy: boolean('easy').notNull(),
},);

const orders = pgTable('orders', {
  id: bigint('id', { mode: 'string' }).primaryKey(),
  orderNumber: varchar('order_number', { length: 255 }).notNull().unique(),
  userId: integer('user_id').references(() => usersTable.id),
  totalAmount: integer('total_amount').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }),
  paymentId: varchar('payment_id', { length: 255 }),
  transactionId: varchar('transaction_id', { length: 255 }), 
  paidAt: timestamp('paid_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancellationReason: varchar('cancellation_reason', { length: 255 }),
  refundId: varchar('refund_id', { length: 255 }), 
  refundedAt: timestamp('refunded_at', { withTimezone: true }), 
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

const orderItems = pgTable('order_items', {
  id: bigint('id', { mode: 'string' }).primaryKey(),
  orderId: bigint('order_id', { mode: 'string' }).references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  eventId: bigint('event_id', { mode: 'string' }).references(() => events.id, { onDelete: 'restrict' }).notNull(),
  eventName: varchar('event_name', { length: 255 }).notNull(),
  barName: varchar('bar_name', { length: 100 }).notNull(),
  location: varchar('location', { length: 255 }).notNull(),
  eventStartDate: timestamp('event_start_date', { withTimezone: true }).notNull(),
  eventEndDate: timestamp('event_end_date', { withTimezone: true }).notNull(),
  hostUserId: integer('host_user_id').notNull(),
  price: integer('price').notNull(),
  quantity: integer('quantity').notNull(),
  subtotal: integer('subtotal').notNull() 
});

const messages = pgTable('messages', {
  id: bigint('id', { mode: 'string' }).primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  userId: integer('user_id').references(() => usersTable.id, { onDelete: 'cascade' }).notNull(),
  eventId: bigint('event_id', { mode: 'string' }).references(() => events.id).notNull()
});

module.exports = { usersTable, userNotificationTable, barsTable, userBarFoldersTable, userBarCollectionTable, userEventCollectionTable, userEventParticipationTable, userEventFoldersTable, events, tags, eventTags, orders, orderItems, messages,barTags, userTags };

