#
# Stage 1: Build the Go binary
#

FROM golang:1.24 AS builder

# Install musl-tools (includes musl-gcc)
RUN apt-get update && apt-get install -y musl-tools

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod tidy

COPY . .

# Set up musl-gcc as the compiler required for the alpine image
ENV CC=musl-gcc

# Build the app with a statically linked binary
RUN CGO_ENABLED=1 GOOS=linux go build -o main .
RUN ls -l /app


#
# Stage 2: Create a smaller image to run the application
#

FROM alpine:3.19 AS runner

# Set the working directory in the new container
WORKDIR /root/

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/main .

# Set environment variables
ENV ENV=${ENV}
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}

CMD ["./main"]