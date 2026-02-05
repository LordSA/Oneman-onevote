import {
  Box,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Container,
  Center,
  Button,
  useToast,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { QrReader } from "react-qr-reader";
import { verifyToken } from "../api/client";

export const BoothPage = () => {
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const toast = useToast();

  // Check for camera availability on mount
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Your browser does not support camera access. Please use a modern browser (Chrome, Safari, Firefox) and ensure you are using HTTPS.");
    }
  }, []);

  const handleScan = async (result: any, error: any) => {
    if (error) {
      const errorName = error?.name || error?.message;
      // Many non-critical errors occur during normal scanning (no QR found)
      // We only care about permission or hardware errors
      if (
        errorName === "NotAllowedError" || 
        errorName === "NotFoundError" ||
        errorName === "NotReadableError" ||
        errorName === "OverconstrainedError"
      ) {
        console.error("Camera Error:", error);
        setCameraError(`${error.name}: ${error.message}`);
      }
      return;
    }

    if (
      result &&
      result?.text &&
      result.text !== data &&
      status === "idle"
    ) {
      const token = result.text;
      setData(token);
      setStatus("verifying");

      try {
        const response = await verifyToken(token);
        setStatus("success");
        setMessage(`Verified: ${response.name || "Voter"}`);
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      } catch (e: any) {
        setStatus("error");
        setMessage(e.response?.data?.error || "Verification Failed");
        setTimeout(() => {
          setStatus("idle");
          setData(null);
        }, 3000);
      }
    }
  };

  return (
    <Container maxW="container.sm" px={4}>
      <VStack spacing={6} align="stretch">
        <Box textAlign="center" color="gray.800">
          <Heading size="lg" mb={2}>Booth Scanner</Heading>
          <Text color="gray.600">Scan voter QR code for verification</Text>
        </Box>

        <Box
          w="full"
          maxW="500px"
          mx="auto"
          bg="black"
          overflow="hidden"
          rounded="2xl"
          position="relative"
          shadow="2xl"
          borderWidth="4px"
          borderColor={
            status === "success"
              ? "green.400"
              : status === "error"
                ? "red.400"
                : "gray.200"
          }
          style={{ aspectRatio: "1/1" }}
        >
          {cameraError ? (
            <Center h="full" w="full" p={6} textAlign="center">
              <VStack spacing={4}>
                <Alert status="error" variant="subtle" rounded="lg">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Camera Error</AlertTitle>
                    <AlertDescription fontSize="xs">
                      {cameraError}
                    </AlertDescription>
                  </Box>
                </Alert>
                <Button size="sm" colorScheme="blue" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </VStack>
            </Center>
          ) : status === "idle" ? (
            <Box position="absolute" top={0} left={0} w="full" h="full">
              <QrReader
                onResult={handleScan}
                constraints={{ 
                  facingMode: "environment"
                }}
                containerStyle={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block",
                  position: "relative"
                }}
                videoContainerStyle={{
                  width: "100%",
                  height: "100%",
                  paddingTop: "0"
                }}
                videoStyle={{ 
                  width: "100%", 
                  height: "100%",
                  objectFit: "cover",
                  display: "block"
                }}
                scanDelay={300}
              />
              {/* Scan Overlay */}
              <Box 
                position="absolute" 
                top="50%" 
                left="50%" 
                transform="translate(-50%, -50%)"
                w="70%" 
                h="70%" 
                border="2px dashed" 
                borderColor="whiteAlpha.600"
                borderRadius="lg"
                pointerEvents="none"
                zIndex={1}
              />
            </Box>
          ) : (
            <Center h="full" w="full" bg={
              status === "verifying" ? "blackAlpha.700" : 
              status === "success" ? "green.500" : "red.500"
            }>
              <VStack color="white" spacing={4}>
                {status === "verifying" && (
                  <>
                    <Spinner size="xl" thickness="4px" speed="0.65s" />
                    <Text fontWeight="bold">Verifying Token...</Text>
                  </>
                )}
                {status === "success" && (
                  <Text fontSize="6xl" fontWeight="bold">✓</Text>
                )}
                {status === "error" && (
                  <Text fontSize="6xl" fontWeight="bold">✕</Text>
                )}
              </VStack>
            </Center>
          )}
        </Box>

        <Box>
          {status === "success" && (
            <Alert status="success" variant="solid" rounded="xl" shadow="md">
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <AlertTitle>Verified!</AlertTitle>
                <AlertDescription fontSize="sm">{message}</AlertDescription>
              </VStack>
            </Alert>
          )}

          {status === "error" && (
            <Alert status="error" variant="solid" rounded="xl" shadow="md">
              <AlertIcon />
              <VStack align="start" spacing={0}>
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription fontSize="sm">{message}</AlertDescription>
              </VStack>
            </Alert>
          )}
          
          {status === "idle" && (
            <Box p={4} bg="blue.50" rounded="xl">
              <VStack spacing={3}>
                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                  Waiting for QR scan...
                </Text>
                {!cameraError && (
                  <Button 
                    size="xs" 
                    variant="ghost" 
                    colorScheme="blue"
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        stream.getTracks().forEach(t => t.stop());
                        toast({ title: "Camera access granted", status: "success", duration: 2000 });
                      } catch (e: any) {
                        setCameraError(e.message || "Manual camera check failed");
                      }
                    }}
                  >
                    Test Camera Access
                  </Button>
                )}
              </VStack>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  );
};
