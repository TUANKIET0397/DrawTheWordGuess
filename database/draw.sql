create database DrawGame;

use DrawGame;

create table Players(
id int auto_increment primary key,
avatar varchar(50),
player_name nvarchar(50),
score int default 0
);

create table rounds(
id int auto_increment primary key,
room_id int,
drawer_id int,
keyword nvarchar(100),
foreign key (drawer_id) references Players(id)
);

create table guesses(
id int auto_increment primary key,
round_id int,
player_id int,
guess_text nvarchar(100),
is_correct boolean default false,
score int default 0,
hire boolean default true,
foreign key(round_id) references Rounds(id),
foreign key (player_id) references players(id)
);

create table keywords(
id int auto_increment primary key,
keyword nvarchar(100)
);

create table rankings(
id int auto_increment primary key,
room_id int,
player_id int,
rank_palyer int,
score int,
foreign key (player_id) references Players(id)
);