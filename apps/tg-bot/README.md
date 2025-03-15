# Remind0

<img src="https://media3.giphy.com/media/SEWEmCymjv8XDbsb8I/giphy.gif?cid=bd3ea57ep35h7i3oqy7gl1w5l4id0nkr90015z9224g39m1r&ep=v1_gifs_search&rid=giphy.gif&ct=g"/>

- Telegram bot to write expenses to a sqlite db.
- Useful if you're used to sending yourself all kinds of notes through some messaging app anyway.
- Just hook up some UI to read all the expenses you send to yourself and plot some piecharts or whatnot.
- Thought as a small project to be hosted on a Rasperry Pi.

### Linux/MacOS Setup

1. Install docker if not installed

```
sudo apt-get update
sudo apt-get install docker.io
```

2. Ensure Docker Daemon is running

```
# check status
sudo systemctl status docker

# if its down
sudo systemctl start docker

# enable it to start on boot
sudo systemctl enable docker
```

3. Navigate to the program

```
cd /your/path/to/remind0
```

4. Build the docker image

```
sudo docker build -t remind0 .
```

5. Run the container with the required token

```

docker run -d \
 -e TELEGRAM_BOT_TOKEN=<tg_api_token> \
 -e ENV=production \
 --name expenses-telegram-bot \
 remind0

```

## Additional

```

docker pull alpine:3.19
docker pull golang:1.24

```
