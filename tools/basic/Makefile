BINFILE = basic.bin
PROJECT_DIR = .
SOURCES = ${PROJECT_DIR}/str-to-hex.asm
CFGFILE = ${PROJECT_DIR}/config.cfg

PROGRAM = basic

# AS      = /c/devtools/cc65/bin/ca65.exe
# LD      = /c/devtools/cc65/bin/ld65.exe
AS      = c:/devtools/cc65/bin/ca65.exe
LD      = c:/devtools/cc65/bin/ld65.exe
RM		= cmd /c del

# # ASFLAGS     += -I inc
# # ASFLAGS     += --cpu 65SC02

# LDFLAGS     += -C ./config.cfg
# ########################################

# .SUFFIXES:
.PHONY: all clean

all: $(PROGRAM)

# ${PROJECT_DIR}/%.o: ${PROJECT_DIR}/%.asm
# 	$(ASM) $(ASFLAGS) $< -o $@

# $(PROGRAM): $(SOURCES:.asm=.o)
# 	$(LD) $(LDFLAGS) -o $@

clean:
	$(RM) $(SOURCES:.asm=.o)

${PROJECT_DIR}/%.o: ${PROJECT_DIR}/%.asm
	$(AS) $< -g -o $@ -I ${PROJECT_DIR}

$(PROGRAM): $(SOURCES:.asm=.o)
	$(LD) -Ln L -C $(CFGFILE) -o $(BINFILE) $^
