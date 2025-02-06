import {
    Container,
    VStack,
    Input,
    Button,
    ButtonGroup,
    Heading,
    Text,
    Box,
    Stack,
    Select,
    useToast,
    useColorMode,
    extendTheme,
    IconButton,
  } from "@chakra-ui/react";
  import { useState } from "react";
  import axios from "axios";
  import { SunIcon, MoonIcon } from "@chakra-ui/icons";
  interface DownloadResponse {
    message: string;
    download_url: string;
    thumbnail_url: string;
    debug_info: string;
  }
  
  const config = {
    initialColorMode: "light",
    useSystemColorMode: false,
  };
  
  export const theme = extendTheme({ config });
  
  function App() {
    const toast = useToast();
    const { colorMode, toggleColorMode } = useColorMode();
    const [format, setFormat] = useState<"mp3" | "mp4">("mp3");
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [quality, setQuality] = useState("best");
  
    const qualityOptions =
      format === "mp3"
        ? [
            { value: "best", label: "High Quality" },
            { value: "medium", label: "Medium Quality" },
            { value: "worst", label: "Low Quality" },
          ]
        : [
            { value: "best", label: "Best Quality" },
            { value: "medium", label: "Medium Quality" },
            { value: "worst", label: "Low Quality" },
          ];
  
    const handleConvert = async (e: React.FormEvent) => {
      e.preventDefault();
  
      if (!url.trim()) {
        setError("Please enter a valid YouTube URL");
        return;
      }
  
      const formData = new FormData();
      formData.append("video_url", url);
      formData.append("quality", quality);
  
      try {
        setIsLoading(true);
        setError("");
  
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL}/download`;
  
        const response = await axios.post<DownloadResponse>(apiUrl, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
  
        const downloadLink = `${import.meta.env.VITE_API_BASE_URL}${
          response.data.download_url
        }`;
  
        // Trigger download automatically
        const link = document.createElement("a");
        link.href = downloadLink;
        link.download = downloadLink.split("/").pop() || "audio.mp3";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
  
        // Reset URL and show success toast
        setUrl("");
        toast({
          title: "Success!",
          description: "Your file is being downloaded.",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } catch (err: any) {
        const errorMessage = axios.isAxiosError(err)
          ? err.response?.data?.detail || "Conversion failed"
          : "An error occurred during conversion";
  
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top",
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <>
        <VStack
          minH="100vh"
          bg={colorMode === "dark" ? "gray.800" : "blue.600"}
          spacing={0}
        >
          {/* Header */}
          <Container maxW="container.md" py={4}>
            <Stack
              direction={{ base: "row" }}
              justify="space-between"
              align={{ base: "center", sm: "center" }}
              w="full"
              spacing={{ base: 4, sm: 0 }}
            >
              <Heading color="white" size="lg">
                YTMP3
              </Heading>
              <IconButton
                size="sm"
                aria-label="Toggle color mode"
                icon={colorMode === "dark" ? <SunIcon /> : <MoonIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              />
            </Stack>
          </Container>
  
          {/* Main Content */}
          <Box flex="1" w="full">
            <Container maxW="container.md" py={8}>
              <VStack
                spacing={6}
                bg={colorMode === "dark" ? "gray.700" : "white"}
                color={colorMode === "dark" ? "white" : "black"}
                p={8}
                borderRadius="lg"
                boxShadow="lg"
              >
                <Text fontSize="lg" fontWeight="bold">
                  Insert a valid video URL
                </Text>
                <Input
                  placeholder="youtube.com/watch?v=..."
                  size="lg"
                  bg={colorMode === "dark" ? "gray.600" : "white"}
                  color={colorMode === "dark" ? "white" : "black"}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                  size="lg"
                  bg={colorMode === "dark" ? "gray.600" : "white"}
                  color={colorMode === "dark" ? "white" : "black"}
                  borderRadius="md"
                  width="full"
                  borderColor={colorMode === "dark" ? "gray.500" : "gray.200"}
                  _hover={{ borderColor: colorMode === "dark" ? "gray.400" : "gray.300" }}
                  _focus={{
                    borderColor: "blue.500",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
                  }}
                >
                  {qualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Stack
                  direction={{ base: "column", md: "row" }}
                  spacing={4}
                  justify="space-between"
                  w="full"
                  align={{ base: "stretch", md: "center" }}
                >
                  <ButtonGroup
                    isAttached
                    bg={colorMode === "dark" ? "gray.600" : "gray.100"}
                    p={1}
                    borderRadius="full"
                    spacing={0}
                    size="sm"
                    width={{ base: "full", md: "auto" }}
                  >
                    <Button
                      flex={{ base: 1, md: "auto" }}
                      colorScheme="gray"
                      bg={format === "mp3" ? (colorMode === "dark" ? "gray.700" : "white") : "transparent"}
                      color={format === "mp3" ? (colorMode === "dark" ? "white" : "gray.700") : (colorMode === "dark" ? "gray.300" : "gray.500")}
                      onClick={() => setFormat("mp3")}
                      borderRadius="full"
                      px={6}
                      _hover={{ bg: format === "mp3" ? (colorMode === "dark" ? "gray.700" : "white") : (colorMode === "dark" ? "gray.700" : "gray.200") }}
                      boxShadow={format === "mp3" ? "sm" : "none"}
                    >
                      MP3
                    </Button>
                    <Button
                      flex={{ base: 1, md: "auto" }}
                      disabled
                      colorScheme="gray"
                      bg={format === "mp4" ? (colorMode === "dark" ? "gray.700" : "white") : "transparent"}
                      color={format === "mp4" ? (colorMode === "dark" ? "white" : "gray.700") : (colorMode === "dark" ? "gray.300" : "gray.500")}
                      onClick={() => setFormat("mp4")}
                      borderRadius="full"
                      px={6}
                      _hover={{ bg: format === "mp4" ? (colorMode === "dark" ? "gray.700" : "white") : (colorMode === "dark" ? "gray.700" : "gray.200") }}
                      boxShadow={format === "mp4" ? "sm" : "none"}
                    >
                      MP4
                    </Button>
                  </ButtonGroup>
                  <Button
                    width={{ base: "full", md: "auto" }}
                    size="md"
                    colorScheme={colorMode === "dark" ? "whiteAlpha" : "blackAlpha"}
                    bg={colorMode === "dark" ? "white" : "black"}
                    color={colorMode === "dark" ? "black" : "white"}
                    onClick={handleConvert}
                    isLoading={isLoading}
                    borderRadius="full"
                    loadingText="Converting..."
                    _hover={{
                      bg: colorMode === "dark" ? "gray.100" : "gray.800",
                      transform: "scale(1.02)",
                    }}
                  >
                    Convert
                  </Button>
                </Stack>
                {error && (
                  <Text color="red.500" fontSize="sm">
                    {error}
                  </Text>
                )}
              </VStack>
  
              {/* Description Section */}
              <VStack
                bg={colorMode === "dark" ? "gray.700" : "white"}
                color={colorMode === "dark" ? "white" : "black"}
                p={8}
                mt={8}
                borderRadius="lg"
                align="start"
                spacing={6}
              >
                <Heading size="lg">YouTube Video Converter</Heading>
                <Text>
                  Transform your favorite YouTube content into downloadable files
                  with our converter tool. Whether you need audio-only MP3 files
                  for music and podcasts, or MP4 video files for offline viewing,
                  our platform makes it simple and straightforward.
                </Text>
                <Text>
                  We prioritize quality in our conversions while maintaining
                  reasonable file sizes. For optimal performance and faster
                  processing, we support videos up to 60 minutes in length. This
                  helps ensure quick and reliable conversions for all users.
                </Text>
                <Text>
                  This tool is web-based and requires no additional downloads or
                  installations. Before using our service, please review our{" "}
                  <Text
                    as="span"
                    color="blue.600"
                    textDecoration="underline"
                    cursor="pointer"
                  >
                    Usage Guidelines
                  </Text>
                  .
                </Text>
                <Heading size="lg">Quick Start Guide</Heading>
                <VStack align="start" spacing={4} w="full">
                  <Text>
                    1. Find your desired YouTube video and copy its URL from the
                    address bar.
                  </Text>
                  <Text>
                    2. Select your preferred format (MP3 for audio-only, MP4 for
                    video with audio).
                  </Text>
                  <Text>
                    3. Press "Convert" and wait briefly while we process your
                    file. Once complete, you'll see a download button to save your
                    converted file.
                  </Text>
                  <Text mt={4}>
                    We appreciate you choosing our converter tool for your media
                    needs.
                  </Text>
                  <Text>
                    Need help finding specific videos? Check out our recommended
                    tool{" "}
                    <Text
                      as="span"
                      color="blue.600"
                      textDecoration="underline"
                      cursor="pointer"
                    >
                      VideoSearch
                    </Text>
                    .
                  </Text>
                </VStack>
              </VStack>
            </Container>
          </Box>
  
          {/* Footer */}
          <Container maxW="container.md" py={4} mt="auto">
            <Stack
              direction={{ base: "column", md: "row" }}
              justify="space-between"
              w="full"
              align={{ base: "center", md: "center" }}
              spacing={{ base: 4, md: 0 }}
            >
              <Text color="white" textAlign={{ base: "center", md: "left" }}>
                © {new Date().getFullYear()} Made by Pheak. All rights reserved.
              </Text>
              <Stack
                direction={{ base: "column", md: "row" }}
                spacing={{ base: 2, md: 4 }}
                align="center"
              >
                <Text color="white" cursor="pointer">
                  Privacy Policy
                </Text>
                <Text color="white" cursor="pointer">
                  Terms of Service
                </Text>
                <Text color="white" cursor="pointer">
                  Contact
                </Text>
              </Stack>
            </Stack>
          </Container>
        </VStack>
      </>
    );
  }
  
  export default App;
  