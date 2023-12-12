import { useEffect, useState } from "react";
import "./App.css";
import { TextField, MenuItem, Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, ref, set } from "firebase/database";
import { onValue, get } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvmWQZziuLIqxavaua2-WLAfuowN4bKD8",
  authDomain: "shafeek-f1df2.firebaseapp.com",
  projectId: "shafeek-f1df2",
  storageBucket: "shafeek-f1df2.appspot.com",
  messagingSenderId: "138284836208",
  appId: "1:138284836208:web:75b23d399ba0b1529c5bb5",
  measurementId: "G-VM3K6GJ28B",
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);
const storage = getStorage(app);

function App() {
  const [Package, setPackage] = useState("");
  const [val, setValue] = useState([]);
  const [days, setDays] = useState([]);
  const [showPackages, setShowPackages] = useState(false);
  const [packageList, setPackageList] = useState([]);
  const [save, setSave] = useState(false);

  useEffect(() => {
    if (showPackages) {
      // Fetch package names from the "itnery" collection
      const itneryRef = ref(db, "itnery");
      onValue(itneryRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const packages = Object.keys(data);
          setPackageList(packages);
        }
      });
    }
  }, [showPackages]);

  useEffect(() => {
    console.log(days);
    console.log(Package);
  }, [days]);

  const handlePackage = async (index, field, value) => {
    const updateDays = (prevDays) => {
      const newDays = [...(prevDays || [])];
      newDays[index] = {
        ...newDays[index],
        [field]: value,
      };
      return newDays;
    };

    if (field === "file" && value) {
      try {
        // Handle image upload to Firebase Storage
        const storagePath = `images/${Package}/day${index + 1}`;
        const storageReference = storageRef(storage, storagePath);
        await uploadBytes(storageReference, value);

        // Get the download URL
        const imageUrl = await getDownloadURL(storageReference);

        // Update the image URL in the Realtime Database
        set(ref(db, `itnery/${Package}/day${index + 1}/imageUrl`), imageUrl);
      } catch (error) {
        console.error("Error uploading image:", error.message);
      }
    } else if (save) {
      const packagePath = Package
        ? `itnery/${Package}/day${index + 1}/${field}`
        : "";
      if (packagePath) {
        set(ref(db, packagePath), value);
      }
    }

    setDays(updateDays);
  };

  const handleDaySelect = (selectedDays) => {
    setValue(selectedDays);

    // Adjust the days array length based on the selected value
    setDays((prevDays) => {
      const newDays = [...prevDays];

      // Remove any excess containers beyond the selected days
      newDays.splice(selectedDays);

      // Add containers up to the selected days
      while (newDays.length < selectedDays) {
        newDays.push({});
      }

      return newDays;
    });
  };

  let user = [];

  const openPackageList = () => {
    setShowPackages(true);
  };

  const selectPackage = (selectedPackage) => {
    setPackage(selectedPackage);
    setShowPackages(false);

    // Fetch data for the selected package
    const itneryRef = ref(db, `itnery/${selectedPackage}`);
    get(itneryRef)
      .then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          const daysData = Object.values(data);
          setDays(daysData);
        }
      })
      .catch((error) => {
        console.error("Error fetching data:", error.message);
      });
  };
  const saveDataToFirebase = async () => {
    // Ensure the user has entered a package name
    if (!Package.trim()) {
      console.error("Please enter a package name.");
      return;
    }

    const packagePath = `itnery/${Package}`;

    // Check if the package already exists in the database
    const packageExists = (await get(ref(db, packagePath))).exists();

    // Creating an object to be stored in the database
    const packageData = {
      [Package]: {},
    };

    for (let index = 0; index < days.length; index++) {
      const day = days[index] || {};
      packageData[Package][`day${index + 1}`] = day;
    }

    // Storing data in Firebase Realtime Database
    if (packageExists) {
      // Update the existing document
      set(ref(db, packagePath), packageData[Package])
        .then(() => {
          console.log("Data updated in Firebase!");
        })
        .catch((error) => {
          console.error("Error updating data in Firebase:", error.message);
        });
    } else {
      // Create a new document
      set(ref(db, packagePath), packageData[Package])
        .then(() => {
          console.log("New data saved to Firebase!");
        })
        .catch((error) => {
          console.error("Error saving new data to Firebase:", error.message);
        });
    }
  };

  const openPrintPage = () => {
    const printContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print Page</title>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <h1>Print Page Content</h1>
        <div>
        ${
          days &&
          days
            .map((items, index) => {
              return `
            <div key=${index}>
              <p>${items.date}</p>
              <p>${items.heading}</p>
              <p>${items.paragraph}</p>
              <p>${items.inclutions}</p>
              <p>${items.imageUrl}</p>
            </div>
          `;
            })
            .join("")
        }
        </div>
      </body>
      </html>
    `;

    // Open a new window
    const printWindow = window.open("", "_blank");

    // Write the content to the new window
    printWindow.document.write(printContent);

    // Trigger the print dialog
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="w-full h-auto px-5 py-5">
        <div className="py-3 flex items-center justify-center">
          <h1 className="text-2xl font-semibold">form</h1>
        </div>
        <div className="w-full h-full flex flex-col gap-5">
          <input
            value={Package}
            onClick={openPackageList}
            onChange={(e) => setPackage(e.target.value)}
            className="border border-1 border-gray-400 rounded-md px-2 py-2"
            placeholder="package name"
            type="text"
          />
          {showPackages && (
            <div className="w-full py-3 px-2 flex flex-col gap-1 bg-gray-200 rounded-md border border-1 border-black">
              {packageList.map((pkg) => (
                <div
                  key={pkg}
                  onClick={() => selectPackage(pkg)}
                  className="cursor-pointer"
                >
                  {pkg}
                </div>
              ))}
            </div>
          )}
          <TextField
            value={val}
            select
            InputProps={{ style: { borderRadius: "5px" } }}
            label="Days"
            onChange={(e) => handleDaySelect(e.target.value)}
            SelectProps={{
              multiple: true,
            }}
          >
            <MenuItem value="1">Day 1</MenuItem>
            <MenuItem value="2">Day 2</MenuItem>
            <MenuItem value="3">Day 3</MenuItem>
          </TextField>

          {val &&
            days.map((_, index) => {
              const day = days[index] || {};
              return (
                <div
                  key={index}
                  className="w-full h-auto px-2 py-3 flex flex-col gap-2 border border-1 border-gray-400 rounded-md"
                >
                  <h1 className="text-xl font-medium py-2">{`Day-${
                    index + 1
                  }`}</h1>
                  <input
                    value={day.date || ""}
                    onChange={(e) =>
                      handlePackage(index, "date", e.target.value)
                    }
                    type="date"
                    className="px-2 py-1 border border-1 border-gray-400 rounded-md"
                  />
                  <input
                    value={day.heading || ""}
                    onChange={(e) =>
                      handlePackage(index, "heading", e.target.value)
                    }
                    type="text"
                    placeholder="Heading"
                    className="px-2 py-1 border border-1 border-gray-400 rounded-md"
                  />
                  <textarea
                    value={day.paragraph || ""}
                    onChange={(e) =>
                      handlePackage(index, "paragraph", e.target.value)
                    }
                    name=""
                    id=""
                    cols="30"
                    rows="10"
                    placeholder="paragraph"
                    className="px-2 py-1 border border-1 border-gray-400 rounded-md"
                  ></textarea>
                  <textarea
                    value={day.inclutions || ""}
                    onChange={(e) =>
                      handlePackage(index, "inclutions", e.target.value)
                    }
                    name=""
                    id=""
                    cols="30"
                    rows="10"
                    placeholder="inclutions"
                    className="px-2 py-1 border border-1 border-gray-400 rounded-md"
                  ></textarea>
                  <Button
                    component="label"
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onChange={(e) =>
                      handlePackage(index, "file", e.target.files[0])
                    }
                  >
                    Upload file
                    <input
                      type="file"
                      onChange={(e) =>
                        handlePackage(index, "file", e.target.files[0])
                      }
                      style={{ display: "none" }}
                    />
                  </Button>
                </div>
              );
            })}
          <Button onClick={saveDataToFirebase} variant="contained">
            save
          </Button>
          <Button onClick={openPrintPage} variant="contained">
            print
          </Button>
        </div>
      </div>
    </>
  );
}

export default App;
