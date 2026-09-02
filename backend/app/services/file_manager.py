# Manages the creation and reading of files in the sandbox directory for code tracing. #
import os, re


def write_to_sandbox(code: str):
    sandbox_dir = "sandbox"  # defines the directory of sandbox
    # checks if the sandbox directory exists, if not it creates one
    if not os.path.exists(sandbox_dir):
        os.makedirs(sandbox_dir)

    # gets the name of the class from the code using regex
    name_match = re.search(r"class\s+(\w+)", code)

    # rename class to Main if no class name is found
    class_name = name_match.group(1) if name_match else "Main"

    # defines the file path of the java file
    file_path = os.path.join(sandbox_dir, f"{class_name}.java")

    # writes the code to the java file in the sandbox directory
    with open(file_path, "w") as f:
        f.write(code)

    # returns the file path and class name of the java file
    return ( 
        file_path,
        class_name,
    )
