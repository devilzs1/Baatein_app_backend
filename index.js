const app = require("./app");
const http = require("http");
const server = http.createServer(app);
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const {Server} = require("socket.io");
const { promisify } = require("util");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");
const OneToOneMessage = require("./models/oneToOneMessage");

process.on("uncaughtException", (err) => {
  console.log(err);
  console.log("UNCAUGHT Exception! Shutting down ...");
  process.exit(1); 
});

const DB = process.env.DBURI.replace(
  "<PASSWORD>",
  process.env.DBPASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    // useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log("DB Connection successful");
  })
  .catch((err) => {
    console.log(err);
  });


  const io = new Server(server, {
    cors: {
      origin: "https://baatein-app.vercel.app",
      // origin: "http://localhost:3001",
      methods: ["GET", "POST"],
    },
  });

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`App running on port ${port} ...`);
});

io.on("connection", async (socket)=>{
  // console.log(socket);
  // console.log(JSON.stringify(socket.handshake.query));

  const user_id = socket.handshake.query.user_id;
  // const user_id = socket.handshake.query("user_id");

  console.log(`User connected ${socket.id}`)

  if (user_id != null && Boolean(user_id)) {
    try {
      User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
        status: "Online",
      });
    } catch (e) {
      console.log(e);
    }
  }

  
  socket.on("friend_request", async (data, callback) => {
    try {
      // Check if the friend request already exists
      const existingRequest = await FriendRequest.findOne({
        sender: data.from,
        recipient: data.to,
      });

      if (existingRequest) {
        // If a request already exists, return "already sent"
        callback("already sent");
      } else {
        // If no request exists, create a new friend request
        await FriendRequest.create({
          sender: data.from,
          recipient: data.to,
        });

        // Emit events to notify sender and recipient
        io.to(data.to).emit("new_friend_request", {
          message: "New friend request received",
        });
        io.to(data.from).emit("request_sent", {
          message: "Request Sent successfully!",
        });

        // Return "sent request"
        callback("sent request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      // Handle error
      callback("error");
    }
  });

  socket.on("accept_request", async (data, callback) => {
    try {
      // Find the friend request by ID
      const request_doc = await FriendRequest.findById(data.request_id);

      // If request not found, return error
      if (!request_doc) {
        return callback("error: request not found");
      }

      // Find sender and receiver
      const sender = await User.findById(request_doc.sender);
      const receiver = await User.findById(request_doc.recipient);

      // Check if sender and receiver exist
      if (!sender || !receiver) {
        return callback("error: sender or receiver not found");
      }

      // Check if the request has already been accepted
      if (
        sender.friends.includes(request_doc.recipient) ||
        receiver.friends.includes(request_doc.sender)
      ) {
        return callback("error: request already accepted");
      }

      // Update sender and receiver's friend lists
      sender.friends.push(request_doc.recipient);
      receiver.friends.push(request_doc.sender);

      // Save sender and receiver
      await receiver.save();
      await sender.save();

      // Delete the friend request
      await FriendRequest.findByIdAndDelete(data.request_id);

      // Emit "request_accepted" event to sender and receiver
      io.to(sender?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
      });
      io.to(receiver?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
      });

      // Callback with success message
      callback("request accepted");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      // Callback with error message
      callback("error: internal server error");
    }
  });


  socket.on("get_direct_conversations", async ({ user_id }, callback) => {
    const existing_conversations = await OneToOneMessage.find({
      participants: { $all: [user_id] },
    }).populate("participants", "firstName lastName avatar _id email status");

    console.log(existing_conversations);

    callback(existing_conversations);
  });

  socket.on("start_conversation", async (data) => {
    const { to, from } = data;

    const existing_conversations = await OneToOneMessage.find({
      participants: { $size: 2, $all: [to, from] },
    }).populate("participants", "firstName lastName _id email status");

    console.log(existing_conversations[0], "Existing Conversation");

    // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
    if (existing_conversations.length === 0) {
      let new_chat = await OneToOneMessage.create({
        participants: [to, from],
      });

      new_chat = await OneToOneMessage.findById(new_chat).populate(
        "participants",
        "firstName lastName _id email status"
      );

      console.log(new_chat);

      socket.emit("start_chat", new_chat);
    }
    // if yes => just emit event "start_chat" & send conversation details as payload
    else {
      socket.emit("start_chat", existing_conversations[0]);
    }
  });

  socket.on("get_messages", async (data, callback) => {
    try {
      const { messages } = await OneToOneMessage.findById(
        data.conversation_id
      ).select("messages");
      callback(messages);
    } catch (error) {
      console.log(error);
    }
  });

  // Handle incoming text/link messages
  socket.on("text_message", async (data) => {
    console.log("Received message:", data);

    const { message, conversation_id, from, to, type } = data;

    const to_user = await User.findById(to);
    const from_user = await User.findById(from);

    const new_message = {
      to: to,
      from: from,
      type: type,
      created_at: Date.now(),
      text: message,
    };

    // fetch OneToOneMessage Doc & push a new message to existing conversation
    const chat = await OneToOneMessage.findById(conversation_id);
    chat.messages.push(new_message);

    await chat.save({ new: true, validateModifiedOnly: true });

    // emit incoming_message -> to user
    io.to(to_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });

    // emit outgoing_message -> from user
    io.to(from_user?.socket_id).emit("new_message", {
      conversation_id,
      message: new_message,
    });
  });

  // handle Media/Document Message
  socket.on("file_message", (data) => {
    console.log("Received message:", data);

    const fileExtension = path.extname(data.file.name);

    // Generate a unique filename
    const filename = `${Date.now()}_${Math.floor(
      Math.random() * 10000
    )}${fileExtension}`;
  });


    socket.on("end", async (data) => {
      if (data.user_id) {
        await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
      }
      console.log("closing connection");
      socket.disconnect(0);
    });
})



process.on("unhandledRejection", (err) => {
  console.log(err);
  console.log("UNHANDLED REJECTION! Shutting down ...");
  server.close(() => {
    process.exit(1);
  });
});