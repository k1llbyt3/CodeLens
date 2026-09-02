
// code to trace a Java program line by line and capture all local variables at each step
import com.sun.jdi.*;
import com.sun.jdi.connect.LaunchingConnector;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;
import java.util.*;
import java.io.*;

public class Tracer {
    public static void main(String[] args) throws Exception {
        // Exit if no class name is provided
        if (args.length < 1) {
            System.err.println("Error: Target class name not provided.");
            System.exit(1);
        }
        String targetClass = args[0]; // gets classname from command line arguments

        // Prepare to launch the target Java program in a background process
        VirtualMachineManager vmm = Bootstrap.virtualMachineManager();
        LaunchingConnector connector = vmm.defaultConnector();
        Map<String, LaunchingConnector.Argument> env = connector.defaultArguments();

        // Tell the background process which class to run and where to find it
        env.get("main").setValue(targetClass);
        env.get("options").setValue("-cp sandbox");

        // Launch the background process
        VirtualMachine vm = connector.launch(env);

        // Ask the virtual machine to pause when it enters any method
        EventRequestManager erm = vm.eventRequestManager();
        MethodEntryRequest mer = erm.createMethodEntryRequest();
        mer.addClassFilter(targetClass);
        mer.enable();

        // Get the event queue to listen for events from the background process
        EventQueue queue = vm.eventQueue();
        boolean running = true;
        int stepCount = 0;
        List<String> jsonSteps = new ArrayList<>();

        // Add a starting snapshot to confirm the tracer booted up
        jsonSteps.add("{\"step\": 0, \"line\": 0, \"locals\": {\"SYSTEM\": \"Tracer booted. Waiting for " + targetClass
                + "\"}, \"callStack\": []}");

        // Keep listening for events until the program finishes
        while (running) {
            EventSet eventSet = queue.remove();
            for (Event event : eventSet) {

                // When a method starts, check if it is the main method
                if (event instanceof MethodEntryEvent mee) {
                    if (mee.method().name().equals("main")) {
                        // Confirm the main method was found
                        jsonSteps.add(
                                "{\"step\": 1, \"line\": 0, \"locals\": {\"SYSTEM\": \"Main method entered successfully!\"}, \"callStack\": []}");

                        // Set up a tripwire to pause on every single line of code
                        StepRequest stepReq = erm.createStepRequest(
                                mee.thread(),
                                StepRequest.STEP_LINE,
                                StepRequest.STEP_OVER);
                        stepReq.addClassFilter(targetClass);
                        stepReq.enable();

                        // Stop asking for method entry events to save performance
                        mee.request().disable();
                    }
                }
                // When the code moves to a new line, capture all variables
                else if (event instanceof StepEvent se) {
                    stepCount++;
                    Location loc = se.location();
                    int line = loc.lineNumber();
                    StackFrame frame = se.thread().frame(0); // captures the current stack frame to read local variables
                    StringBuilder varsJson = new StringBuilder("{"); // Start building a JSON object for local variables

                    // Try to read all variables currently active in this block of code
                    try {
                        List<LocalVariable> visibleVars = frame.visibleVariables();
                        // Loop through each variable and add it to the JSON object
                        for (int i = 0; i < visibleVars.size(); i++) {
                            LocalVariable var = visibleVars.get(i);
                            Value val = frame.getValue(var);
                            varsJson.append("\"").append(var.name()).append("\": ").append(formatValue(val));

                            // Add a comma between variables, except for the last one
                            if (i < visibleVars.size() - 1)
                                varsJson.append(", ");
                        }
                    } catch (AbsentInformationException e) {
                        // Ignore if variable names are missing (happens if compiled without -g)
                    }
                    varsJson.append("}");

                    // Save this exact moment as a JSON string
                    jsonSteps.add(String.format(
                            "{\"step\": %d, \"line\": %d, \"locals\": %s, \"callStack\": [\"%s\"]}",
                            stepCount + 1, line, varsJson.toString(), loc.method().name()));
                }
                // Stop the loop if the background program crashes or finishes naturally
                else if (event instanceof VMDeathEvent || event instanceof VMDisconnectEvent) {
                    running = false;
                }
            }
            // Tell the background program to continue running
            eventSet.resume();
        }

        // If the code never ran, read the hidden crash logs to find out why
        if (stepCount == 0) {
            InputStream errorStream = vm.process().getErrorStream();
            // Use try-with-resources to automatically close the Scanner and prevent memory leaks
            try (Scanner sc = new Scanner(errorStream).useDelimiter("\\A")) {
                if (sc.hasNext()) {
                    // Read the entire error stream and format it for JSON
                    String jvmError = sc.next().replace("\"", "\\\"").replace("\n", " | ");
                    jsonSteps.add("{\"step\": 99, \"line\": 0, \"locals\": {\"CRITICAL_CRASH\": \"" + jvmError
                            + "\"}, \"callStack\": []}");
                }
            }
        }

        // Print the final list of all captured steps so Python can read it
        System.out.println("[" + String.join(", ", jsonSteps) + "]");
    }

    // Helper function to convert Java memory values into clean JSON text
    private static String formatValue(Value val) {
        if (val == null)
            return "null";

        // Loop through arrays and format each item inside
        if (val instanceof ArrayReference arr) {
            List<String> elements = new ArrayList<>();
            for (Value element : arr.getValues()) {
                elements.add(formatValue(element));
            }
            return "[" + String.join(", ", elements) + "]";
        }

        // Wrap text in quotation marks
        if (val instanceof StringReference strRef) {
            return "\"" + strRef.value() + "\"";
        }

        // Return basic numbers and booleans exactly as they are
        return val.toString();
    }
}