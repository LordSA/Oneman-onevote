import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  useToast,
  Container,
  Card,
  CardBody,
  Divider,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  FormControl,
  FormLabel,
  Input,
  HStack,
} from "@chakra-ui/react";
import QRCode from "react-qr-code";
import { useState, useEffect } from "react";
import { devSetup, registerVoter } from "../api/client";
import { rtdb, auth } from "../firebase-config";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";

interface VoterData {
  id: string;
  name: string;
  rfid: string;
  qrData: string;
  has_voted: boolean;
  timestamp?: number | string;
}

export const VoterPage = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [voters, setVoters] = useState<VoterData[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regRfid, setRegRfid] = useState("");
  
  const toast = useToast();

  // Real-time listener for voters from RTDB
  useEffect(() => {
    // Wait for authentication before listening
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        try {
          setIsListening(true);
          const votersRef = ref(rtdb, "voters");
          // RTDB orderByKey and limitToLast works well for chronologically created pushes
          const votersQuery = query(votersRef, limitToLast(20));

          const unsubscribeRTDB = onValue(
            votersQuery,
            (snapshot) => {
              const votersList: VoterData[] = [];
              snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                votersList.push({
                  id: childSnapshot.key as string,
                  ...data,
                });
              });
              // Reverse for list view (newest first)
              setVoters([...votersList].reverse());
              setErrorMsg(null);
            },
            (error) => {
              console.error("RTDB error:", error);
              setErrorMsg(error.message);
              setIsListening(false);
            }
          );

          return () => unsubscribeRTDB();
        } catch (error: any) {
          setErrorMsg(error.message);
          setIsListening(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regRfid) {
      toast({ title: "Please fill all fields", status: "warning" });
      return;
    }

    setIsLoading(true);
    try {
      // Generate a unique QR string for this voter
      const generatedQr = `VOTE_${regName.toUpperCase().replace(/\s/g, "_")}_${Math.floor(1000 + Math.random() * 9000)}`;
      
      await registerVoter({
        name: regName,
        rfid: regRfid,
        qrData: generatedQr
      });

      setToken(generatedQr);
      setRegName("");
      setRegRfid("");
      toast({ title: "Voter Registered Successfully", status: "success" });
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDemo = async () => {
    setIsLoading(true);
    try {
      const data = await devSetup();
      setToken(data.token);
      toast({ title: "Demo Data Created", status: "info" });
    } catch (e) {
      toast({ title: "Error creating demo", status: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="container.md" px={4}>
      <Tabs align="center">
        <TabList mb={6}>
          <Tab>Register Voter</Tab>
          <Tab>Voter Directory</Tab>
        </TabList>

        <TabPanels>
          {/* Tab 1: Registration and QR Display */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Box textAlign="center">
                <Heading size="lg" mb={2}>Registration</Heading>
                <Text color="gray.600">Link physical RFID tags to digital identities.</Text>
              </Box>

              <Card variant="outline" shadow="sm" borderRadius="xl">
                <CardBody p={6}>
                  {token ? (
                    <VStack spacing={6}>
                      <Badge colorScheme="green" p={2} borderRadius="md" variant="subtle">
                        Registration Complete!
                      </Badge>
                      <Box 
                        p={4} 
                        bg="white" 
                        border="1px solid" 
                        borderColor="gray.100" 
                        borderRadius="lg"
                        boxShadow="sm"
                      >
                        <QRCode 
                          value={token} 
                          size={200}
                          style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
                        />
                      </Box>
                      <Divider />
                      <VStack spacing={2} textAlign="center">
                        <Text fontWeight="bold">Digital Token (QR String)</Text>
                        <Box p={2} bg="gray.50" borderRadius="md" w="full">
                          <Text fontSize="sm" fontFamily="monospace">{token}</Text>
                        </Box>
                        <Button variant="link" colorScheme="blue" onClick={() => setToken(null)}>
                          Register Another
                        </Button>
                      </VStack>
                    </VStack>
                  ) : (
                    <VStack as="form" onSubmit={handleRegister} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Voter Name</FormLabel>
                        <Input 
                          placeholder="e.g. Shibili" 
                          value={regName} 
                          onChange={(e) => setRegName(e.target.value)}
                        />
                      </FormControl>
                      
                      <FormControl isRequired>
                        <FormLabel>RFID UID (from Serial Monitor)</FormLabel>
                        <Input 
                          placeholder="e.g. 834D4CC5" 
                          value={regRfid} 
                          onChange={(e) => setRegRfid(e.target.value)}
                        />
                      </FormControl>
                      
                      <Button 
                        type="submit" 
                        colorScheme="blue" 
                        size="lg" 
                        w="full" 
                        isLoading={isLoading}
                      >
                        Create Voter Profile
                      </Button>
                      
                      <Divider py={2} />
                      
                      <Button 
                        onClick={handleGenerateDemo} 
                        variant="outline" 
                        size="sm" 
                        isLoading={isLoading}
                      >
                        Create Demo Profile
                      </Button>
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Tab 2: Voter List */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Box textAlign="center">
                <Heading size="lg" mb={2}>All Voters</Heading>
                <Text color="gray.600" fontSize="sm">
                  Real-time voter profile monitoring
                </Text>
              </Box>

              <Card variant="outline" shadow="sm" borderRadius="xl">
                <CardBody p={0}>
                  {voters.length > 0 ? (
                    <Box overflowX="auto">
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th py={4}>Name</Th>
                            <Th py={4}>RFID</Th>
                            <Th py={4}>Status</Th>
                            <Th py={4}>Voted At</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {voters.map((voter) => (
                            <Tr key={voter.id}>
                              <Td fontWeight="bold">{voter.name}</Td>
                              <Td fontFamily="monospace" fontSize="xs">{voter.rfid}</Td>
                              <Td>
                                {voter.has_voted ? (
                                  <Badge colorScheme="red">Voted</Badge>
                                ) : (
                                  <Badge colorScheme="green">Eligible</Badge>
                                )}
                              </Td>
                              <Td fontSize="xs" color="gray.500">
                                {voter.timestamp 
                                  ? new Date(voter.timestamp).toLocaleTimeString() 
                                  : "-"}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  ) : (
                    <VStack py={12}>
                      <Spinner color="blue.500" />
                      <Text color="gray.500">No voters registered yet.</Text>
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};
