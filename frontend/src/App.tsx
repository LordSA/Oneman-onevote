import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from "react-router-dom";
import { Box, Flex, Button, Container, Heading, HStack, Text } from "@chakra-ui/react";
import { VoterPage } from "./pages/VoterPage";
import { BoothPage } from "./pages/BoothPage";

function App() {
  return (
    <Router>
      <Box minH="100vh" bg="gray.50">
        <Box 
          as="nav" 
          bg="white" 
          borderBottom="1px" 
          borderColor="gray.200" 
          py={3} 
          position="sticky" 
          top={0} 
          zIndex={10}
        >
          <Container maxW="container.lg">
            <Flex align="center" justify="space-between">
              <Heading size="md" color="blue.600" letterSpacing="tight">
                SecureVote
              </Heading>
              <HStack spacing={[2, 4]}>
                <Button 
                  as={RouterLink} 
                  to="/" 
                  size="sm" 
                  variant="ghost"
                  px={[2, 4]}
                >
                  Voter
                </Button>
                <Button 
                  as={RouterLink} 
                  to="/booth" 
                  size="sm" 
                  colorScheme="blue"
                  px={[2, 4]}
                >
                  Booth
                </Button>
              </HStack>
            </Flex>
          </Container>
        </Box>

        <Box py={[4, 8]}>
          <Routes>
            <Route path="/" element={<VoterPage />} />
            <Route path="/booth" element={<BoothPage />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;
