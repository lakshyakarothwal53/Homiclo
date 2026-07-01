-- discounts module tables

create table if not exists discounts_dashboard (
  id   integer primary key default 1,
  data jsonb   not null
);

create table if not exists discounts_active (
  name       text primary key,
  type       text not null,
  value      text not null,
  applies_to text not null,
  valid_till text not null,
  used       text not null,
  status     text not null
);

-- One table for all promo types (flat / percentage / category / product), keyed by discount_type.
create table if not exists discount_promos (
  id            text    primary key,
  discount_type text    not null,
  name          text    not null,
  code          text    not null,
  value_type    text    not null,
  value         integer not null,
  min_order     integer not null,
  valid_from    text    not null,
  valid_to      text    not null,
  used          integer not null,
  cap           integer,
  status        text    not null
);

create table if not exists discount_campaigns (
  name       text primary key,
  blurb      text not null,
  valid_till text not null,
  used       text not null,
  status     text not null
);

create table if not exists discount_seasonal (
  season     text primary key,
  offer      text not null,
  discount   text not null,
  valid_from text not null,
  valid_to   text not null,
  status     text not null
);

create table if not exists discount_usage (
  code           text    primary key,
  discount       text    not null,
  times_used     integer not null,
  discount_given integer not null,
  avg_order      integer not null,
  conversion     integer not null
);
