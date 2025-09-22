# Remind-o

>
> A Telegram bot for expense tracking with Turso DB integration.
>

<details>
<summary>This is me at the moment</summary>
<div align="center">
  <img src="https://media3.giphy.com/media/SEWEmCymjv8XDbsb8I/giphy.gif?cid=bd3ea57ep35h7i3oqy7gl1w5l4id0nkr90015z9224g39m1r&ep=v1_gifs_search&rid=giphy.gif&ct=g" alt="Expenses Tracking Bot"/>
</div>
</details>

## Prerequisites

- Docker
- Telegram Bot with @BotFather
- Turso Database

## Installation

### Setup

1. Install docker if not installed

```zsh
sudo apt-get update
sudo apt-get install docker.io
```

2. Ensure Docker Daemon is running

```zsh
# check status
sudo systemctl status docker

# if its down
sudo systemctl start docker

# enable it to start on boot
sudo systemctl enable docker
```

3. Navigate to the program

```zsh
cd /your/path/to/remind0
```

4. Build the docker image

```zsh
sudo docker build -t remind0 .
```

5. Run the container with the required token

### Deployment

Run the container with your credentials now

```zsh
docker run -d \
 -e TELEGRAM_BOT_TOKEN=<tg_api_token> \
 -e TURSO_DATABASE_URL=<db_dsn> \
 -e TURSO_AUTH_TOKEN=<auth_jwt> \
 -e ENV=production \
 --name expenses-telegram-bot \
 remind0
```

### Additional

I've had issues with Docker not pulling through the images correctly. Can also grab them manually.

```zsh
docker pull alpine:3.19
docker pull golang:1.24
```
