FROM openjdk:17
WORKDIR /usr/src/app
COPY . .
RUN javac -cp .:json-20210307.jar *.java
CMD ["sh", "-c", "cat input.txt | java -cp .:json-20210307.jar Run"]
