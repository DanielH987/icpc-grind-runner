#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
using namespace std;

// Declare the user function
int {{FUNC_NAME}}({{FUNC_DECL_ARGS}});

int main() {
    using json = nlohmann::json;

    std::string inputLine;
    std::getline(std::cin, inputLine);
    json args = json::parse(inputLine);

    // {{TEMP_VARS}}
    
    std::stringstream buffer;
    std::streambuf* old = std::cout.rdbuf(buffer.rdbuf());

    int result = {{FUNC_NAME}}({{FUNC_CALL_ARGS}});

    std::cout.rdbuf(old);

    json output;
    output["stdout"] = buffer.str();
    output["output"] = result;
    std::cout << output.dump() << std::endl;

    return 0;
}
