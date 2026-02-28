#
# Stage 1: Build the Go binary
#

FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Pure Go build (pgx driver has no CGO dependency)
RUN CGO_ENABLED=0 GOOS=linux go build -o main .


#
# Stage 2: Create a smaller image to run the application
#

FROM alpine:3.19 AS runner

WORKDIR /root/

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/main .

CMD ["./main"]
