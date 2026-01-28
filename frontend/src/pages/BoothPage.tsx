import {
  Box,
  Center,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { QrReader } from "react-qr-reader";
import { verifyToken } from "../api/client";

// Define strict types for QrReader props if needed, or use 'any' if types are missing
// The modern library often uses 'onResult' instead of 'onScan'

export const BoothPage = () => {
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<string | null>(null);

  const handleScan = async (result: any) => {
    if (
      result &&
      result?.text &&
      result.text !== data &&
      status !== "verifying" &&
      status !== "success"
    ) {
      const token = result.text;
      setData(token);
      setStatus("verifying");

      try {
        await verifyToken(token);
        setStatus("success");
        setMessage("Voter Verified Successfully");
        // Reset after 3 seconds for next voter
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.response?.data?.error || "Verification Failed");
        // Reset after 3 seconds
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      }
    }
  };

  return (
    <Center h="100vh" bg="gray.900" color="white">
      <VStack spacing={8} w="full" maxW="md" p={4}>
        <Heading size="xl">Polling Booth Scanner</Heading>

        <Box
          w="full"
          h="300px"
          bg="black"
          overflow="hidden"
          rounded="xl"
          position="relative"
          border={
            status === "success"
              ? "4px solid green"
              : status === "error"
                ? "4px solid red"
                : "4px solid gray"
          }
        >
          {status === "idle" && (
            <QrReader
              onResult={handleScan}
              constraints={{ facingMode: "environment" }}
              containerStyle={{ width: "100%", height: "100%" }}
              videoStyle={{ objectFit: "cover" }}
            />
          )}
          {status === "verifying" && (
            <Center h="full">
              <Spinner size="xl" />
            </Center>
          )}
          {status !== "idle" && status !== "verifying" && (
            <Center
              h="full"
              bg={status === "success" ? "green.500" : "red.500"}
            >
              <VStack>
                <Text fontSize="4xl" fontWeight="bold">
                  {status === "success" ? "✓" : "✕"}
                </Text>
              </VStack>
            </Center>
          )}
        </Box>

        {status === "success" && (
          <Alert status="success" variant="solid" rounded="md">
            <AlertIcon />
            <VStack align="start">
              <AlertTitle>Verified!</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </VStack>
          </Alert>
        )}

        {status === "error" && (
          <Alert status="error" variant="solid" rounded="md">
            <AlertIcon />
            <VStack align="start">
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </VStack>
          </Alert>
        )}

        <Text fontSize="sm" color="gray.400">
          Scan voter QR code to verify eligibility
        </Text>
      </VStack>
    </Center>
  );
};
