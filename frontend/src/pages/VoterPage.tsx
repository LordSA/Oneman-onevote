import {
  Box,
  Button,
  Center,
  Heading,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import QRCode from "react-qr-code";
import { useState } from "react";
import { devSetup } from "../api/client";

export const VoterPage = () => {
  const [token, setToken] = useState<string | null>(null);
  const toast = useToast();

  const handleGenerateValues = async () => {
    try {
      const data = await devSetup();
      setToken(data.token);
      toast({ title: "Identity Generated", status: "success" });
    } catch (e) {
      toast({ title: "Error generating identity", status: "error" });
    }
  };

  return (
    <Center h="100vh" bg="gray.50">
      <VStack spacing={8} p={8} bg="white" rounded="xl" shadow="lg">
        <Heading size="lg" color="blue.600">
          Voter Identity
        </Heading>

        {token ? (
          <>
            <Box p={4} bg="white" border="2px solid black">
              <QRCode value={token} size={256} />
            </Box>
            <Text fontSize="sm" color="gray.500">
              Present this QR code at the polling booth.
            </Text>
            <Text fontSize="xs" fontFamily="monospace">
              {token}
            </Text>
          </>
        ) : (
          <VStack>
            <Text>No active identity found.</Text>
            <Button onClick={handleGenerateValues} colorScheme="blue">
              Generate Demo Identity
            </Button>
          </VStack>
        )}
      </VStack>
    </Center>
  );
};
