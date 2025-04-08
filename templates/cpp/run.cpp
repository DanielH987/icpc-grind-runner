#include <iostream>
#include <nlohmann/json.hpp>
#include "main.cpp"

using json = nlohmann::json;
using namespace std;

// Change this signature to match your expected input/output types
json callFunctionFromInput(json args) {
    // Example for function: int add(int a, int b)
    int a = args[0];
    int b = args[1];
    int result = add(a, b);  // Assume user code has int add(int, int)
    return result;
}

int main() {
    string inputStr((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
    json args = json::parse(inputStr);
    json output = callFunctionFromInput(args);

    json result = {
        {"stdout", ""},
        {"output", output}
    };
    cout << result.dump() << endl;
    return 0;
}
