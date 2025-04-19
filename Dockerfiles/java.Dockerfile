FROM openjdk:17
WORKDIR /usr/src/app

# Download the JSON jar directly during build
RUN curl -O https://repo1.maven.org/maven2/org/json/json/20210307/json-20210307.jar

COPY . .

RUN javac -cp .:json-20210307.jar *.java
CMD ["sh", "-c", "cat input.txt | java -cp .:json-20210307.jar Run"]
