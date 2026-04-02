-- Bureaus per citizen (Name, Notes, Login, Password)

create table if not exists bureaus (
  id          serial primary key,
  citizen_id  int  not null references citizens(id) on delete cascade,
  name        text not null,
  notes       text not null default '',
  login       text not null,
  password    text not null
);

alter table bureaus enable row level security;
