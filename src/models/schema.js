const { pgTable, varchar, bigint, timestamp, integer, index, smallint, serial, primaryKey  } = require('drizzle-orm/pg-core');

const events = pgTable('events', {
  id: bigint('id', { mode: 'string' }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  barName: varchar('bar_name', { length: 100 }).notNull(),
  location: varchar('location', { length: 100 }).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  maxPeople: integer('max_people'),
  imageUrl: varchar('image_url', { length: 255 }),
  price: integer('price'),
  hostUser: integer('host_user').notNull(),
  createdAt: timestamp('created_at').notNull(),
  modifyAt: timestamp('modify_at').notNull(), 
  status: smallint('status').default(1).notNull(), //1: 正常，2: 刪除
}, (table) => ({
  hostUserIdx: index('idx_host_user').on(table.hostUser),
}));

const tags  = pgTable('tags', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }),
});

const eventTags  = pgTable('event_tags', {
  eventId: bigint('event_id', { mode: 'string' }).notNull().references(() => events.id, {onDelete: 'cascade'}),
  tagId: integer('tag_id').notNull().references(() => tags.id, {onDelete: 'cascade'}),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.tagId] })
}));



module.exports = { events, tags, eventTags };