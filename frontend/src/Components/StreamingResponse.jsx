import React, { useState, useEffect, useRef } from "react";
import { Grid, Avatar, Typography } from "@mui/material";
import BotAvatar from "../Assets/BotAvatar.svg";
import { ALLOW_CHAT_HISTORY, WEBSOCKET_API, ALLOW_MARKDOWN_BOT } from "../utilities/constants";
import { useMessage } from "../contexts/MessageContext";
import createMessageBlock from "../utilities/createMessageBlock";
import ReactMarkdown from "react-markdown";

const StreamingMessage = ({ initialMessage, processing, setProcessing, handleBotResponse }) => {
  const [responses, setResponses] = useState([]);
  const ws = useRef(null);
  const messageBuffer = useRef("");
  const { messageList, addMessage } = useMessage();
  const responsesRef = useRef(responses); // Add ref to store responses

  useEffect(() => {
    ws.current = new WebSocket(WEBSOCKET_API);

    ws.current.onopen = () => {
      console.log("WebSocket Connected");
      ws.current.send(
        JSON.stringify({
          action: "sendMessage",
          prompt: initialMessage,
          history: ALLOW_CHAT_HISTORY ? messageList : [],
        })
      );
      console.log("Initial message sent to bot");
      console.log("Message list: ", messageList);
    };

    ws.current.onmessage = (event) => {
      try {
        messageBuffer.current += event.data;
        const parsedData = JSON.parse(messageBuffer.current);

        if (parsedData.type === "end") {
          setProcessing(false);
          console.log("End of conversation");
          appendBotResponse();
        }
        
        if (parsedData.type === "delta") {
          setResponses((prev) => {
            const newResponses = [...prev, parsedData.text];
            responsesRef.current = newResponses;
            return newResponses;
          });
        }

        messageBuffer.current = "";
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.log("Received incomplete JSON, waiting for more data...");
        } else {
          console.error("Error processing message: ", e);
          messageBuffer.current = "";
        }
      }
    };

    ws.current.onerror = (error) => {
      console.log("WebSocket Error: ", error);
    };

    ws.current.onclose = (event) => {
      if (event.wasClean) {
        console.log(
          `WebSocket closed cleanly, code=${event.code}, reason=${event.reason}`
        );
      } else {
        console.log("WebSocket Disconnected unexpectedly");
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [initialMessage, setProcessing]);

  // This function just sends the bot message to the chat bosy to be appended to the message list
  const appendBotResponse = () => {
    const finalMessage = responsesRef.current.join("");
      handleBotResponse(finalMessage);
  }

  return (
    <Grid container direction="row" justifyContent="flex-start" alignItems="flex-end">
      <Grid item>
        <Avatar alt="Bot Avatar" src={BotAvatar} />
      </Grid>
      {ALLOW_MARKDOWN_BOT ? (
        <Grid item className="botMessage" sx={{ backgroundColor: (theme) => theme.palette.background.botMessage }}>
          <Typography variant="body2" component="div">
            <ReactMarkdown>{responses.join("")}</ReactMarkdown>
          </Typography>
        </Grid>
      ) : (
        <Grid item className="botMessage" sx={{ backgroundColor: (theme) => theme.palette.background.botMessage }}>
          <Typography variant="body2" component="div">{responses.join("")}</Typography>  
        </Grid>
      )}
    </Grid>
  );
};

export default StreamingMessage;