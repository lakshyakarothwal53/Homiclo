-- notifications module — one table, rows keyed by category
-- category: 'all' | 'stock' | 'attendance' | 'payment' | 'system'
-- icon_name: LucideIcon component name; resolved back to the component in the hook

create table if not exists notifications (
  id          text primary key,
  category    text not null,
  title       text not null,
  description text not null,
  time        text not null,
  tone        text not null,
  icon_name   text not null
);
