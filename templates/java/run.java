import java.io.*;
import java.lang.reflect.*;
import java.nio.file.*;
import java.util.*;
import org.json.*;

public class Run {
    public static void main(String[] args) {
        try {
            // Step 1: Read input
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            StringBuilder inputBuilder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                inputBuilder.append(line);
            }
            JSONArray inputArgs = new JSONArray(inputBuilder.toString());

            // Step 2: Extract function name from user code
            String code = new String(Files.readAllBytes(Paths.get("Solution.java")));
            String funcName = extractFunctionName(code);

            // Step 3: Load compiled class
            Class<?> cls = Class.forName("Solution");

            // Step 4: Find the method dynamically
            for (Method method : cls.getDeclaredMethods()) {
                if (method.getName().equals(funcName)) {
                    Object[] methodArgs = new Object[method.getParameterCount()];
                    Class<?>[] paramTypes = method.getParameterTypes();

                    for (int i = 0; i < paramTypes.length; i++) {
                        Class<?> paramType = paramTypes[i];
                        if (paramType == int.class) {
                            methodArgs[i] = inputArgs.getInt(i);
                        } else if (paramType == double.class) {
                            methodArgs[i] = inputArgs.getDouble(i);
                        } else if (paramType == String.class) {
                            methodArgs[i] = inputArgs.getString(i);
                        } else if (paramType == boolean.class) {
                            methodArgs[i] = inputArgs.getBoolean(i);
                        } else if (paramType == List.class || paramType.isAssignableFrom(ArrayList.class)) {
                            JSONArray arr = inputArgs.getJSONArray(i);
                            List<Integer> list = new ArrayList<>();
                            for (int j = 0; j < arr.length(); j++) {
                                list.add(arr.getInt(j));
                            }
                            methodArgs[i] = list;
                        } else {
                            methodArgs[i] = null;
                        }
                    }

                    // Step 5: Capture stdout
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    PrintStream originalOut = System.out;
                    PrintStream ps = new PrintStream(baos);
                    System.setOut(ps);

                    Object result = method.invoke(null, methodArgs);

                    // Reset stdout
                    System.out.flush();
                    System.setOut(originalOut);

                    String outputText = baos.toString().trim();

                    // Step 6: Return result in JSON format
                    JSONObject output = new JSONObject();
                    output.put("stdout", outputText);
                    output.put("output", result);
                    System.out.println(output.toString());
                    return;
                }
            }

            throw new RuntimeException("Function not found in user code");

        } catch (Exception e) {
            JSONObject output = new JSONObject();
            output.put("stdout", "");
            output.put("output", JSONObject.NULL);
            output.put("error", e.getMessage());
            System.out.println(output.toString());
        }
    }

    private static String extractFunctionName(String code) {
        // Match public static <type> <name>(
        String pattern = "public\\s+static\\s+\\w+\\s+(\\w+)\\s*\\(";
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern).matcher(code);
        if (matcher.find())
            return matcher.group(1);
        throw new RuntimeException("Could not extract function name");
    }
}
