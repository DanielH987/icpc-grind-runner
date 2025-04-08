#include <iostream>
#include <nlohmann/json.hpp>
#include "main.cpp" // contains the user's function definition

using json = nlohmann::json;
using namespace std;

// Modify this to match the expected function signature
json callFunction(json args) {
    int a = args[0];
    int b = args[1];
    int result = add(a, b); // assuming user's function is int add(int, int)
    return result;
}

int main() {
    try {
        string input((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());
        json args = json::parse(input);
        json result = {
            {"stdout", ""},
            {"output", callFunction(args)}
        };
        cout << result.dump() << endl;
    } catch (const exception& e) {
        json err = {
            {"stdout", ""},
            {"output", nullptr},
            {"error", e.what()}
        };
        cout << err.dump() << endl;
    }
    return 0;
}
