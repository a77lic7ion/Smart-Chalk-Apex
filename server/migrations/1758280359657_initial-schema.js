exports.up = pgm => {
  // Users table
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    name: { type: 'varchar(255)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Training Data table
  pgm.createTable('training_data', {
    id: 'id',
    source_id: { type: 'varchar(255)' },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    curriculum: { type: 'text' },
    standard: { type: 'text' },
    grade: { type: 'varchar(255)' },
    subject: { type: 'varchar(255)' },
    content: { type: 'jsonb' }, // Assuming content is stored as JSON
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Saved Tests table
  pgm.createTable('saved_tests', {
    id: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    content: { type: 'jsonb' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Presentations table
  pgm.createTable('presentations', {
    id: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Slides table
  pgm.createTable('slides', {
    id: { type: 'varchar(255)', primaryKey: true },
    presentation_id: { type: 'varchar(255)', references: '"presentations" (id)', onDelete: 'CASCADE' },
    content: { type: 'jsonb' },
  });

  // Image Placeholders table
  pgm.createTable('image_placeholders', {
      id: { type: 'varchar(255)', primaryKey: true },
      presentation_id: { type: 'varchar(255)', references: '"presentations" (id)', onDelete: 'CASCADE' },
      query: { type: 'text' },
  });

  // Lesson Plans table
  pgm.createTable('lesson_plans', {
    id: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    content: { type: 'jsonb' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Generic Saved Content table for exams, homework, etc.
  // This simplifies the schema instead of having many similar tables.
  pgm.createTable('saved_content', {
    id: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    type: { type: 'varchar(50)', notNull: true }, // 'exam', 'homework', 'parsed_exam', 'manual_exam'
    content: { type: 'jsonb' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Image Library table
  pgm.createTable('image_library', {
    id: { type: 'varchar(255)', primaryKey: true },
    user_id: { type: 'integer', references: '"users" (id)', onDelete: 'CASCADE' },
    subject: { type: 'varchar(255)' },
    topic: { type: 'varchar(255)' },
    image_url: { type: 'text', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
};

exports.down = pgm => {
  pgm.dropTable('image_library');
  pgm.dropTable('saved_content');
  pgm.dropTable('lesson_plans');
  pgm.dropTable('image_placeholders');
  pgm.dropTable('slides');
  pgm.dropTable('presentations');
  pgm.dropTable('saved_tests');
  pgm.dropTable('training_data');
  pgm.dropTable('users');
};
