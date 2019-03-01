import * as fs from 'fs';

interface TagEntry {
    tag: string;
    photoIds: number[]
}

interface Photo {
    id: number;
    orientation: string;
    tags: string[];
    tagScore: number;
}

interface Slide {
    photos: Photo[];
    tags: string[];
}

interface Slideshow {
    slides: Slide[],
    score: number
}

let photos: Photo[] = [];

// Map of tag -> TagEntry,
//   where each TagEntry contains the IDs of all photos that have that tag
let allTags: Map<string, TagEntry> = new Map<string, TagEntry>();

/**
 * Creates a Photo by parsing a line.
 */
function readPhoto(line: string, nextIndex: number): Photo {

    let parts: string[] = line.split(" ");
    let orientation: string = parts[0];
    let numTags: number = parseFloat(parts[1]);
    let tags: string[] = [];
    
    for (let i = 0; i < numTags; i++) {
        tags = [...tags, parts[i+2]];
    }

    return {
        id: nextIndex,
        orientation,
        tags,
        tagScore: 0
    };
}

/**
 * Reads an input file.
 */
function readFile(filename: string): void {
    
    // Read data from file
    let data = fs.readFileSync(filename, "utf-8");
    let dataByLine: string[] = data.split("\n");

    // Read number of Photos
    const firstLine: string = <string> dataByLine.shift();
    const numPhotos = parseInt(firstLine);

    // Read Photos
    let nextIndex: number = 0;
    for (let line of dataByLine) {

        if (!line) {
            continue;
        }

        let photo: Photo = readPhoto(line.trim(), nextIndex);

        // Register this Photo with the relevant tags
        photo.tags.forEach(tag => {
            let tagEntry: TagEntry | undefined = allTags.get(tag);
            if (tagEntry) {
                tagEntry.photoIds.push(photo.id);
            } else {
                tagEntry = {
                    tag,
                    photoIds: [photo.id]
                }
            }
            allTags.set(tag, tagEntry);
        });

        nextIndex++;
        photos.push(photo);
    }
}

/**
 * Creates an output file.
 */
function createOutput(slideshow : Slideshow, filename: string): void {

    console.log('Writing solution for ', filename);
    let wstream = fs.createWriteStream(`output/${filename}.output`);

    // Write number of slides
    wstream.write(slideshow.slides.length + '\n');

    // Write each slide
    slideshow.slides.forEach((s: Slide) => {
        s.photos.forEach((photo) => {
            wstream.write(`${photo.id} `);
        });
        wstream.write(`\n`);
    });

    wstream.end();
}
 
/**
 * Calculates the score of a Slideshow.
 */
function getScore(slideshow: Slideshow): number {
    let score = 0;

    for (let i = 0; i < slideshow.slides.length; i++) {
        if (i == slideshow.slides.length - 1) break;
        score += compareSlides(slideshow.slides[i], slideshow.slides[i + 1]);
    }

    return score;
}

/**
 * Calculates the score awarded for 2 adjacent Slides.
 */
function compareSlides(slide1: Slide, slide2: Slide): number {

    let commonTags = 0;
    for (let tag of slide1.tags) {
        if (slide2.tags.includes(tag)) {
            commonTags++;
            continue;
}
    }

    let uncommonLeftTags = 0;
    for (let tag of slide1.tags) {
        if (!slide2.tags.includes(tag)) {
            uncommonLeftTags++;
            continue;
        }
    }

    let uncommonRightTags = 0;
    for (let tag of slide2.tags) {
        if (!slide1.tags.includes(tag)) {
            uncommonRightTags++;
            continue;
        }
    }

    return Math.min(commonTags, uncommonLeftTags, uncommonRightTags);
}

/**
 * Creates a vertical Slide from 2 Photos.
 */
function createVerticalSlide(photo1: Photo, photo2: Photo): Slide {
    let tags: string[] = [];
    tags = tags.concat(photo1.tags);
    tags = tags.concat(photo2.tags);
    let tagSet: Set<string> = new Set(tags);
    let slide: Slide = {
        photos: [photo1, photo2],
        tags: Array.from(tagSet.values())
    };
    return slide;
}

/**
 * Creates a horizontal Slide from a Photo.
 */
function createHorizontalSlide(photo: Photo): Slide {
    return {
        photos: [photo],
        tags: photo.tags
    };
}

/**
 * Calculates the "tag score" of a Photo.
 *
 * The tag score is the sum of the scores of all of a Photo's tags.
 *
 * The score of a tag is the number of Photos that have that tag.
 */
function calculateTagScore(photo: Photo): number {
    let score = 0;
    photo.tags.forEach(tag => {
        let tagEntry: TagEntry | undefined = allTags.get(tag);
        if (tagEntry) {
            score += tagEntry.photoIds.length;
        }
    });
    return score;
}

/**
 * Creates a solution to the problem.
 *
 * Different solutions were attempted here, and should be uncommented as
 * required.
 */
function solve() {

    ////////////////////////////////////////////////////////////////////////////
    // Photo Sort Algorithm 1
    // ----------------------
    // Photos containing the most popular tags come first.
    ////////////////////////////////////////////////////////////////////////////

    /*
    // Sort TagEntries by most popular
    let tagEntries: TagEntry[] = Array.from(allTags.values());
    tagEntries = tagEntries.sort((tagEntry1, tagEntry2) => {
        return tagEntry2.photoIds.length - tagEntry1.photoIds.length
    });

    // Get the photo IDs from these tags in order
    let sortedPhotoIds: number[] = [];
    tagEntries.forEach(tagEntry => {
        tagEntry.photoIds.forEach(photoId => {
            sortedPhotoIds.push(photoId);
        })
    });
    sortedPhotoIds = [...new Set<number>(sortedPhotoIds)];

    // Sort our photos accordingly
    let sortedPhotos: Photo[] = [];
    for (let photoId of sortedPhotoIds) {
        let photo = photos[photoId];
        sortedPhotos.push(photo);
    }
    photos = sortedPhotos;
    */

    ////////////////////////////////////////////////////////////////////////////
    // Photo Sort Algorithm 2
    // ----------------------
    // Photos with the highest tag score come first.
    ////////////////////////////////////////////////////////////////////////////

    photos = photos.sort((photo1, photo2) => {
        photo1.tagScore = calculateTagScore(photo1);
        photo2.tagScore = calculateTagScore(photo2);
        return photo2.tagScore - photo1.tagScore;
    });

    ////////////////////////////////////////////////////////////////////////////
    // End of Photo Sort Algorithms
    ////////////////////////////////////////////////////////////////////////////

    // Filter Photos by orientation
    const horizontalPhotos: Photo[] =
            photos.filter(photo => photo.orientation === 'H');
    const verticalPhotos: Photo[] =
            photos.filter(photo => photo.orientation === 'V');

    // Produce Slides from our Photos
    const horizontalSlides: Slide[] = [];
    const verticalSlides: Slide[] = [];

    // Horizontal
    for (const photo of horizontalPhotos) {
        let slide: Slide = createHorizontalSlide(photo);
        horizontalSlides.push(slide);
    }

    // Vertical
    for (let i = 0; i < verticalPhotos.length; i += 2) {
        if (i + 1 >= verticalPhotos.length) {
            // We have run out of photos to pair with!
            break;
        }
        let slide: Slide = createVerticalSlide(
            verticalPhotos[i],
            verticalPhotos[i + 1]
        );
        verticalSlides.push(slide);
    }

    let slides: Slide[] = [];

    ////////////////////////////////////////////////////////////////////////////
    // Slide Sort Algorithm 1
    // ----------------------
    // Horizontal Slides first, then vertical.
    ////////////////////////////////////////////////////////////////////////////

    slides = [...horizontalSlides, ...verticalSlides];

    ////////////////////////////////////////////////////////////////////////////
    // Slide Sort Algorithm 2
    // ----------------------
    // Horizontal Slides and vertical Slides interleaved.
    ////////////////////////////////////////////////////////////////////////////

    /*
    let maxLength = Math.max(horizontalSlides.length, verticalSlides.length);

    for (const i = 0; i < maxLength; i++) {
        if (i < horizontalSlides.length) {
            slides.push(horizontalSlides[i]);
        }
        if (i < verticalSlides.length) {
            slides.push(verticalSlides[i]);
        }
    }
    */

    ////////////////////////////////////////////////////////////////////////////
    // Slide Sort Algorithm 3
    // ----------------------
    // Slides chosen one by one from either the horizontal or vertical list,
    // based on whichever would give the highest score.
    ////////////////////////////////////////////////////////////////////////////

    // (Implemented but not committed - oops!)

    ////////////////////////////////////////////////////////////////////////////
    // End of Slide Sort Algorithms
    ////////////////////////////////////////////////////////////////////////////

    return slides;
}

/**
 * Resets global variables between runs.
 */
function reset(): void {
    photos = [];
    allTags = new Map<string, TagEntry>();
}

const files = [
    "./files_in/a_example.txt",
    "./files_in/b_lovely_landscapes.txt",
    "./files_in/c_memorable_moments.txt",
    "./files_in/d_pet_pictures.txt",
    "./files_in/e_shiny_selfies.txt"
];

// Solve all files
files.forEach(f => {

    reset();
    
    // Solve this file
    readFile(f);
    const slides: Slide[] = solve();

    // Create output
    const slideshow: Slideshow = {
        slides,
        score: 0
    };
    slideshow.score = getScore(slideshow);
    console.log(f + ': ' + slideshow.score);
    createOutput(
        slideshow, 
        f.substring(f.lastIndexOf('/')+1, f.lastIndexOf("."))
    );
});
